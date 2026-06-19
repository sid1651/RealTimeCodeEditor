const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { sendVerificationOtpEmail } = require('../utils/emailService');

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const PASSWORD_SALT_ROUNDS = Number(process.env.PASSWORD_SALT_ROUNDS || 10);

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || '',
  avatar: user.avatar || '',
  authProvider: user.authProvider || 'local',
  emailVerified: Boolean(user.emailVerified),
  hasCompletedOnboarding: user.hasCompletedOnboarding !== false,
  createdAt: user.createdAt,
});

const getSocialProviderLabels = (user) => {
  const providers = [];

  if (user.googleId) {
    providers.push('Google');
  }

  if (user.githubId) {
    providers.push('GitHub');
  }

  return providers;
};

const createOtp = () => `${crypto.randomInt(100000, 1000000)}`;
const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

const applyVerificationOtp = (user, otp) => {
  user.verificationOtpHash = hashOtp(otp);
  user.verificationOtpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
  user.verificationOtpSentAt = new Date();
};

const sendVerificationOtpEmailInBackground = ({ to, name, otp }) => {
  setImmediate(() => {
    sendVerificationOtpEmail({ to, name, otp }).catch((error) => {
      console.error(`Failed to send verification OTP to ${to}:`, error.message);
    });
  });
};

const verifyGoogleCredential = async (credential) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.REACT_APP_GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    throw new Error('Google authentication is not configured. Set GOOGLE_CLIENT_ID in the server environment.');
  }

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || 'Unable to verify Google credential.');
  }

  if (payload.aud !== googleClientId) {
    throw new Error('Google credential audience does not match this app.');
  }

  if (payload.email_verified !== 'true' && payload.email_verified !== true) {
    throw new Error('Google email is not verified.');
  }

  return payload;
};

const getGitHubClientId = () => process.env.GITHUB_CLIENT_ID || process.env.REACT_APP_GITHUB_CLIENT_ID;

const exchangeGitHubCode = async ({ code, redirectUri = '' }) => {
  const clientId = getGitHubClientId();
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('GitHub authentication is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in the server environment.');
  }

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri || undefined,
    }),
  });

  const payload = await response.json();

  if (!response.ok || payload.error) {
    throw new Error(payload.error_description || payload.error || 'Unable to exchange GitHub authorization code.');
  }

  if (!payload.access_token) {
    throw new Error('GitHub did not return an access token.');
  }

  return payload.access_token;
};

const fetchGitHubUserProfile = async (accessToken) => {
  const commonHeaders = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${accessToken}`,
    'User-Agent': 'Kodikos',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  const profileResponse = await fetch('https://api.github.com/user', {
    headers: commonHeaders,
  });
  const profile = await profileResponse.json();

  if (!profileResponse.ok) {
    throw new Error(profile.message || 'Unable to fetch GitHub profile.');
  }

  let email = profile.email || '';

  if (!email) {
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: commonHeaders,
    });
    const emailPayload = await emailResponse.json();

    if (!emailResponse.ok) {
      throw new Error(emailPayload.message || 'Unable to fetch GitHub email addresses.');
    }

    const primaryEmail = Array.isArray(emailPayload)
      ? emailPayload.find((item) => item.primary && item.verified) || emailPayload.find((item) => item.verified)
      : null;

    email = primaryEmail?.email || '';
  }

  if (!email) {
    throw new Error('Your GitHub account does not expose a verified email address.');
  }

  return {
    id: profile.id ? String(profile.id) : '',
    login: profile.login || '',
    name: profile.name || profile.login || email.split('@')[0],
    email,
    avatar: profile.avatar_url || '',
  };
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone = '' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      if (!existingUser.emailVerified) {
        return res.status(409).json({
          message: 'This email is already registered but not verified yet. Please verify it with the OTP.',
          requiresVerification: true,
          email: normalizedEmail,
        });
      }

      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
    const otp = createOtp();
    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      password: hashedPassword,
      emailVerified: false,
      hasCompletedOnboarding: false,
    });
    applyVerificationOtp(user, otp);

    await user.save();
    sendVerificationOtpEmailInBackground({
      to: normalizedEmail,
      name: user.name,
      otp,
    });

    return res.status(201).json({
      message: 'Verification OTP is being sent to your email.',
      requiresVerification: true,
      email: normalizedEmail,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to register user.', details: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (!user.password) {
      const providers = getSocialProviderLabels(user);
      const providerMessage = providers.length
        ? `${providers.join(' or ')} sign-in`
        : 'social sign-in';

      return res.status(401).json({
        message: `This account uses ${providerMessage}. Continue with ${providerMessage} instead.`,
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        message: 'Please verify your email with the OTP before logging in.',
        requiresVerification: true,
        email: normalizedEmail,
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    return res.status(200).json({
      message: 'Logged in successfully.',
      token: generateToken(user._id.toString()),
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to log in.', details: error.message });
  }
};

const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required.' });
    }

    const googleUser = await verifyGoogleCredential(credential);
    const normalizedEmail = googleUser.email?.trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Google account did not provide an email.' });
    }

    let user = await User.findOne({ email: normalizedEmail });
    const isNewUser = !user;

    if (!user) {
      user = new User({
        name: googleUser.name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        authProvider: 'google',
        googleId: googleUser.sub || '',
        avatar: googleUser.picture || '',
        emailVerified: true,
        hasCompletedOnboarding: false,
      });
    } else {
      user.emailVerified = true;
      user.googleId = user.googleId || googleUser.sub || '';
      user.avatar = googleUser.picture || user.avatar || '';

      if (!user.password && user.authProvider === 'local') {
        user.authProvider = 'google';
      }
    }

    await user.save();

    return res.status(200).json({
      message: 'Signed in with Google successfully.',
      token: generateToken(user._id.toString()),
      user: sanitizeUser(user),
      isNewUser,
    });
  } catch (error) {
    return res.status(401).json({ message: 'Unable to sign in with Google.', details: error.message });
  }
};

const githubAuth = async (req, res) => {
  try {
    const { code, redirectUri = '' } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'GitHub authorization code is required.' });
    }

    const accessToken = await exchangeGitHubCode({ code, redirectUri });
    const githubUser = await fetchGitHubUserProfile(accessToken);
    const normalizedEmail = githubUser.email.trim().toLowerCase();

    let user = await User.findOne({ email: normalizedEmail });
    const isNewUser = !user;

    if (!user) {
      user = new User({
        name: githubUser.name,
        email: normalizedEmail,
        authProvider: 'github',
        githubId: githubUser.id || '',
        avatar: githubUser.avatar || '',
        emailVerified: true,
        hasCompletedOnboarding: false,
      });
    } else {
      user.emailVerified = true;
      user.githubId = user.githubId || githubUser.id || '';
      user.avatar = githubUser.avatar || user.avatar || '';

      if (!user.password && user.authProvider === 'local') {
        user.authProvider = 'github';
      }
    }

    await user.save();

    return res.status(200).json({
      message: 'Signed in with GitHub successfully.',
      token: generateToken(user._id.toString()),
      user: sanitizeUser(user),
      isNewUser,
    });
  } catch (error) {
    return res.status(401).json({ message: 'Unable to sign in with GitHub.', details: error.message });
  }
};

const verifyRegistrationOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+password +verificationOtpHash');

    if (!user) {
      return res.status(404).json({ message: 'No account found for this email.' });
    }

    if (user.emailVerified) {
      return res.status(200).json({
        message: 'Email is already verified.',
        token: generateToken(user._id.toString()),
        user: sanitizeUser(user),
      });
    }

    if (!user.verificationOtpHash || !user.verificationOtpExpiresAt) {
      return res.status(400).json({ message: 'No active OTP found. Please request a new one.' });
    }

    if (user.verificationOtpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    const otpHash = hashOtp(String(otp).trim());
    if (otpHash !== user.verificationOtpHash) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }

    user.emailVerified = true;
    user.verificationOtpHash = null;
    user.verificationOtpExpiresAt = null;
    user.verificationOtpSentAt = null;
    await user.save();

    return res.status(200).json({
      message: 'Email verified successfully.',
      token: generateToken(user._id.toString()),
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to verify OTP.', details: error.message });
  }
};

const resendRegistrationOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+verificationOtpHash');

    if (!user) {
      return res.status(404).json({ message: 'No account found for this email.' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: 'This account is already verified. Please sign in.' });
    }

    if (
      user.verificationOtpSentAt &&
      Date.now() - user.verificationOtpSentAt.getTime() < OTP_RESEND_COOLDOWN_MS
    ) {
      return res.status(429).json({ message: 'Please wait a minute before requesting a new OTP.' });
    }

    const otp = createOtp();
    applyVerificationOtp(user, otp);

    await user.save();
    sendVerificationOtpEmailInBackground({
      to: normalizedEmail,
      name: user.name,
      otp,
    });

    return res.status(200).json({
      message: 'A new OTP is being sent to your email.',
      requiresVerification: true,
      email: normalizedEmail,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to resend OTP.', details: error.message });
  }
};

const getCurrentUser = async (req, res) => {
  return res.status(200).json({
    user: sanitizeUser(req.user),
  });
};

const updateCurrentUser = async (req, res) => {
  try {
    const { name, email, phone = '' } = req.body;

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ message: 'Name and email are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: req.user._id },
    });

    if (existingUser) {
      return res.status(409).json({ message: 'That email is already being used by another account.' });
    }

    req.user.name = name.trim();
    req.user.email = normalizedEmail;
    req.user.phone = phone.trim();
    await req.user.save();

    return res.status(200).json({
      message: 'Profile updated successfully.',
      user: sanitizeUser(req.user),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update profile.', details: error.message });
  }
};

const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    user.password = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);
    await user.save();

    return res.status(200).json({
      message: 'Password updated successfully.',
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update password.', details: error.message });
  }
};

const completeOnboarding = async (req, res) => {
  try {
    if (req.user.hasCompletedOnboarding === false) {
      req.user.hasCompletedOnboarding = true;
      await req.user.save();
    }

    return res.status(200).json({
      message: 'Onboarding completed.',
      user: sanitizeUser(req.user),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to complete onboarding.', details: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  googleAuth,
  githubAuth,
  verifyRegistrationOtp,
  resendRegistrationOtp,
  getCurrentUser,
  updateCurrentUser,
  updatePassword,
  completeOnboarding,
};

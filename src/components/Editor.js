import React, { useEffect } from 'react';
import CodeMirror from 'codemirror';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material.css';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/edit/closetag';

const Editor = () => {
    function init() {
            CodeMirror.fromTextArea(document.getElementById('realtimeEditor'), {
                mode: 'javascript',
                theme: 'material',
                lineNumbers: true,
                autoCloseBrackets: true,
                autoCloseTags: true,
            });
        }  

        
    useEffect(() => {
        init();
    }, []);

    return (
    
        <textarea id="realtimeEditor"></textarea>
        
    );
};

export default Editor;

import React, {useRef, useEffect} from 'react';
import ReactDOM from 'react-dom/client';
import HigherOrder from './HigherOrder';

let rootEl = document.getElementById('root');
if(rootEl == null) throw new Error("No root element given.");

const root = ReactDOM.createRoot(rootEl);
root.render(<React.StrictMode>
  <HigherOrder />
</React.StrictMode>);
(function () {
  'use strict';

  var style = document.createElement('style');
  style.textContent = 'x-dc{display:contents}body{margin:0}';
  document.head.appendChild(style);

  function loadScript(src) {
    return new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = resolve;
      document.head.appendChild(s);
    });
  }

  function processHelmet(xdc) {
    var h = xdc.querySelector('helmet');
    if (!h) return;
    Array.from(h.children).forEach(function (child) {
      if (child.tagName === 'SCRIPT') {
        var src = child.getAttribute('src') || '';
        if (src.indexOf('_ds') !== -1) return; // skip missing bundle
        var s = document.createElement('script');
        if (src) { s.src = src; } else { s.textContent = child.textContent; }
        document.head.appendChild(s);
      } else {
        document.head.appendChild(child.cloneNode(true));
      }
    });
  }

  async function bootstrap() {
    // Load React 17 (stable UMD build)
    await loadScript('https://unpkg.com/react@17/umd/react.production.min.js');
    await loadScript('https://unpkg.com/react-dom@17/umd/react-dom.production.min.js');

    // Define DCLogic globally so the component class can extend it
    class DCLogic {
      setState(patch) {
        Object.assign(this.state, patch);
        if (this._update) this._update();
      }
      componentDidMount() {}
    }
    window.DCLogic = DCLogic;

    document.querySelectorAll('x-dc').forEach(function (xdc) {
      processHelmet(xdc);

      var scriptEl = xdc.querySelector('script[data-dc-script]');
      if (!scriptEl) return;

      // Execute component via inline script so class fields work natively
      var injector = document.createElement('script');
      injector.textContent = scriptEl.textContent + '\nwindow.__dcComp=typeof Component!=="undefined"?Component:null;';
      document.head.appendChild(injector);
      document.head.removeChild(injector);

      var ComponentClass = window.__dcComp;
      delete window.__dcComp;

      if (!ComponentClass) {
        console.error('support.js: Component class not found after evaluation');
        return;
      }

      class Wrapper extends React.Component {
        constructor(props) {
          super(props);
          this.inst = new ComponentClass();
          this.inst._update = () => this.forceUpdate();
        }
        componentDidMount() {
          if (this.inst.componentDidMount) this.inst.componentDidMount();
        }
        render() {
          try {
            var v = this.inst.renderVals();
            var e = React.createElement;
            return e('div', {
              style: {
                display: 'flex', height: '100vh', overflow: 'hidden',
                fontFamily: "'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",
                color: '#1b2d44'
              }
            },
              v.nav,
              e('div', { style: { flex: 1, overflowY: 'auto', background: '#f6f8fb', minWidth: 0 } }, v.mainContent),
              v.projectModal
            );
          } catch (err) {
            console.error('support.js render error:', err);
            return React.createElement('pre', { style: { padding: 24, color: 'red' } }, String(err));
          }
        }
      }

      var container = document.createElement('div');
      xdc.innerHTML = '';
      xdc.appendChild(container);
      ReactDOM.render(React.createElement(Wrapper), container);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();

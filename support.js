(function () {
  'use strict';

  // Make x-dc a transparent layout wrapper
  const baseStyle = document.createElement('style');
  baseStyle.textContent = 'x-dc{display:contents;}body{margin:0;}';
  document.head.appendChild(baseStyle);

  function loadScript(src) {
    return new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = resolve; // don't block on 404
      document.head.appendChild(s);
    });
  }

  // Move <helmet> children into <head>, skipping the missing _ds bundle
  function processHelmet(xdc) {
    var h = xdc.querySelector('helmet');
    if (!h) return;
    Array.from(h.children).forEach(function (child) {
      var tag = child.tagName;
      if (tag === 'SCRIPT') {
        var src = child.getAttribute('src') || '';
        if (src.indexOf('_ds') !== -1) return; // missing; React loaded from CDN instead
        var s = document.createElement('script');
        if (src) { s.src = src; } else { s.textContent = child.textContent; }
        document.head.appendChild(s);
      } else {
        document.head.appendChild(child.cloneNode(true));
      }
    });
  }

  async function bootstrap() {
    await loadScript('https://unpkg.com/react@18/umd/react.production.min.js');
    await loadScript('https://unpkg.com/react-dom@18/umd/react-dom.production.min.js');

    // Base class that the component extends
    function DCLogic() {}
    DCLogic.prototype.setState = function (patch) {
      Object.assign(this.state, patch);
      if (this._update) this._update();
    };
    DCLogic.prototype.componentDidMount = function () {};
    window.DCLogic = DCLogic;

    document.querySelectorAll('x-dc').forEach(function (xdc) {
      processHelmet(xdc);

      var scriptEl = xdc.querySelector('script[data-dc-script]');
      if (!scriptEl) return;

      var ComponentClass;
      try {
        // The script block defines: class Component extends DCLogic { ... }
        var fn = new Function('DCLogic', scriptEl.textContent + '\nreturn Component;');
        ComponentClass = fn(DCLogic);
      } catch (err) {
        console.error('DC component parse error:', err);
        return;
      }

      var e = React.createElement;

      // Wrapper React component — calls renderVals() on every state change
      function Wrapper(props) {
        var self = this;
        React.Component.call(this, props);
        this.inst = new ComponentClass();
        this.inst._update = function () { self.forceUpdate(); };
      }
      Wrapper.prototype = Object.create(React.Component.prototype);
      Wrapper.prototype.constructor = Wrapper;
      Wrapper.prototype.componentDidMount = function () {
        this.inst.componentDidMount && this.inst.componentDidMount();
      };
      Wrapper.prototype.render = function () {
        var v = this.inst.renderVals();
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
      };

      // Clear the raw {{ }} template text and mount React
      var container = document.createElement('div');
      xdc.innerHTML = '';
      xdc.appendChild(container);
      ReactDOM.createRoot(container).render(e(Wrapper));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();

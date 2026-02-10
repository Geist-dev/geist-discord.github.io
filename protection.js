// Антидебаг защита
(function() {
  'use strict';
  
  // Блокировка F12, Ctrl+Shift+I, Ctrl+U
  document.addEventListener('keydown', function(e) {
    // F12
    if (e.keyCode === 123) {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+I
    if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+J
    if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
      e.preventDefault();
      return false;
    }
    // Ctrl+U (View Source)
    if (e.ctrlKey && e.keyCode === 85) {
      e.preventDefault();
      return false;
    }
    // Ctrl+S (Save Page)
    if (e.ctrlKey && e.keyCode === 83) {
      e.preventDefault();
      return false;
    }
  }, false);

  // Блокировка правой кнопки мыши
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
  }, false);

  // Защита от выделения текста
  document.addEventListener('selectstart', function(e) {
    e.preventDefault();
    return false;
  }, false);

  // Защита от копирования
  document.addEventListener('copy', function(e) {
    e.preventDefault();
    return false;
  }, false);

  // Детект DevTools
  var devtools = {
    isOpen: false,
    orientation: undefined
  };

  var threshold = 160;
  var emitEvent = function(state, orientation) {
    window.dispatchEvent(new CustomEvent('devtoolschange', {
      detail: {
        isOpen: state,
        orientation: orientation
      }
    }));
  };

  setInterval(function() {
    var widthThreshold = window.outerWidth - window.innerWidth > threshold;
    var heightThreshold = window.outerHeight - window.innerHeight > threshold;
    var orientation = widthThreshold ? 'vertical' : 'horizontal';

    if (!(heightThreshold && widthThreshold) && 
        ((window.Firebug && window.Firebug.chrome && window.Firebug.chrome.isInitialized) || widthThreshold || heightThreshold)) {
      if (!devtools.isOpen || devtools.orientation !== orientation) {
        emitEvent(true, orientation);
        devtools.isOpen = true;
        devtools.orientation = orientation;
      }
    } else {
      if (devtools.isOpen) {
        emitEvent(false, undefined);
        devtools.isOpen = false;
        devtools.orientation = undefined;
      }
    }
  }, 500);

  window.addEventListener('devtoolschange', function(e) {
    if (e.detail.isOpen) {
      // Редирект при открытии DevTools
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0b0d;color:#fff;font-family:Arial;font-size:24px;">🔒 Access Denied</div>';
      setTimeout(function() {
        window.location.href = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      }, 1000);
    }
  });

  // Защита от debugger
  setInterval(function() {
    (function() {
      return false;
    })
    ['constructor']('debugger')
    ['call']();
  }, 50);

  // Защита исходного кода
  Object.defineProperty(document, 'body', {
    get: function() {
      return document.getElementsByTagName('body')[0];
    }
  });

  // Блокировка Drag & Drop
  document.addEventListener('dragstart', function(e) {
    e.preventDefault();
    return false;
  }, false);

  // Детект копирования через инспектор
  var element = new Image();
  Object.defineProperty(element, 'id', {
    get: function() {
      devtools.isOpen = true;
      emitEvent(true, devtools.orientation);
      throw new Error('DevTools detected');
    }
  });

  console.log('%c⚠️ ВНИМАНИЕ!', 'color: red; font-size: 40px; font-weight: bold;');
  console.log('%cИспользование консоли разработчика может привести к краже данных!', 'color: orange; font-size: 18px;');
  console.log('%cНе вставляйте сюда никакой код!', 'color: red; font-size: 18px; font-weight: bold;');

})();

const codeMarkup = require( './codeMarkup.js' )

let cm, cmconsole, exampleCode, 
    isStereo = false,
    environment = {},
    fontSize = 1

window.onload = function() {
  cm = CodeMirror( document.querySelector('#editor'), {
    mode:   'javascript',
    value:  '// click in the editor to begin!!!',
    keyMap: 'playground',
    autofocus: true,
    //matchBrackets:true,
    indentUnit:2,
    autoCloseBrackets:true,
    tabSize:2,
    extraKeys:{ 'Ctrl-Space':'autocomplete' },
    hintOptions:{ hint:CodeMirror.hint.javascript }
  })

  Babel.registerPlugin( 'jsdsp', jsdsp )

  cm.setSize( null, '100%' )

  function getURL(url, c) {
    var xhr = new XMLHttpRequest();
    xhr.open("get", url, true);
    xhr.send();
    xhr.onreadystatechange = function() {
      if (xhr.readyState != 4) return;
      if (xhr.status < 400) return c(null, xhr.responseText);
      var e = new Error(xhr.responseText || "No response");
      e.status = xhr.status;
      c(e);
    };
  }

  let server
  getURL("./gibberdef.json", function(err, code) {
  //getURL("../node_modules/tern/defs/ecmascript.json", function(err, code) {
    if (err) throw new Error("request for gibberdef.json: " + err);
    console.log( 'loaded gibber environment definition.' )
    environment.server = server = new CodeMirror.TernServer({defs: [JSON.parse( code )], options:{ hintDelay:5000 } })

    cm.setOption("extraKeys", {
      "Ctrl-Space": function(cm) { server.complete(cm) },
      "Ctrl-I"    : function(cm) { server.showType(cm) },
      "Ctrl-O"    : function(cm) { server.showDocs(cm) }
    })
    cm.on( 'cursorActivity', function( cm ) { 
      server.updateArgHints( cm ) 
    })

    cm.on( 'change', function( cm, change ) {
      if( change.text[ change.text.length - 1 ] === '.' ) {
        server.complete( cm )
      }
    })
  })

  cm.getWrapperElement().addEventListener( 'click', e => {
    if( e.altKey === true ) {

      if( e.shiftKey === true ) {
        const ele = document.createElement('span')
        let node = e.path[0]
        while( node.parentNode.className.indexOf( 'CodeMirror-line' ) === -1 ) {
          node = node.parentNode
        }
        const split = node.innerText.split( '=' )[0].split('.')
        let txt = null
        try {
          let obj = window[  split[0].trim() ]
          for( let i = 1; i < split.length; i++ ) {
            obj = obj[ split[ i ].trim() ]
          }
          txt = obj.value !== undefined ? obj.value : obj
        } catch(e) {
          throw e
        }
        ele.innerText = txt
        tempTooltip( cm, ele, server )
      }else{
        server.showDocs( cm ) 
      }
    }
  })

  var Pos = CodeMirror.Pos;
  var cls = "CodeMirror-Tern-";
  var bigDoc = 250;
  function elt(tagname, cls /*, ... elts*/) {
    var e = document.createElement(tagname);
    if (cls) e.className = cls;
    for (var i = 2; i < arguments.length; ++i) {
      var elt = arguments[i];
      if (typeof elt == "string") elt = document.createTextNode(elt);
      e.appendChild(elt);
    }
    return e;
  }
  function tempTooltip(cm, content, ts) {
    if (cm.state.ternTooltip) remove(cm.state.ternTooltip);
    var where = cm.cursorCoords();
    var tip = cm.state.ternTooltip = makeTooltip(where.right + 1, where.bottom, content);
    function maybeClear() {
      old = true;
      if (!mouseOnTip) clear();
    }
    function clear() {
      cm.state.ternTooltip = null;
      if (tip.parentNode) fadeOut(tip)
      clearActivity()
    }
    var mouseOnTip = false, old = false;
    CodeMirror.on(tip, "mousemove", function() { mouseOnTip = true; });
    CodeMirror.on(tip, "mouseout", function(e) {
      var related = e.relatedTarget || e.toElement
      if (!related || !CodeMirror.contains(tip, related)) {
        if (old) clear();
        else mouseOnTip = false;
      }
    });
    setTimeout(maybeClear, ts.options.hintDelay ? ts.options.hintDelay : 1700);
    var clearActivity = onEditorActivity(cm, clear)
  }

  function onEditorActivity(cm, f) {
    cm.on("cursorActivity", f)
    cm.on("blur", f)
    cm.on("scroll", f)
    cm.on("setDoc", f)
    return function() {
      cm.off("cursorActivity", f)
      cm.off("blur", f)
      cm.off("scroll", f)
      cm.off("setDoc", f)
    }
  }

  function makeTooltip(x, y, content) {
    var node = elt("div", cls + "tooltip", content);
    node.style.left = x + "px";
    node.style.top = y + "px";
    document.body.appendChild(node);
    return node;
  }

  function remove(node) {
    var p = node && node.parentNode;
    if (p) p.removeChild(node);
  }

  function fadeOut(tooltip) {
    tooltip.style.opacity = "0";
    setTimeout(function() { remove(tooltip); }, 1100);
  }

  const workletPath = '../dist/gibberish_worklet.js' 

  const start = () => {
    cm.setValue('')
    Gibber.init( workletPath ).then( ()=> {
      
    })
  

    environment.editor = cm
    //environment.console = cmconsole
    window.Environment = environment
    environment.annotations = true

    // XXX this should not be in 'debug' mode...
    environment.debug = true
    environment.codeMarkup = codeMarkup( Gibber )
    environment.codeMarkup.init()

    environment.displayCallbackUpdates = function() {
      Gibberish.oncallback = function( cb ) {
        environment.console.setValue( cb.toString() )
      }
    }

    environment.Annotations = environment.codeMarkup 
    Gibber.Environment = environment

    window.onclick = null
    window.onkeypress = null
  }
  
  window.onclick = start
  window.onkeypress = start

 
/*
  let select = document.querySelector( 'select' ),
    files = [
    ]

  select.onchange = function( e ) {
    loadexample( files[ select.selectedIndex ] )
  }

  let loadexample = function( filename ) {
    var req = new XMLHttpRequest()
    req.open( 'GET', './examples/'+filename, true )
    req.onload = function() {
      var js = req.responseText
      window.Environment.editor.setValue( js )
    }

    req.send()
  }
*/
  //loadexample( 'deepnote.js' )

  //setupSplit()
}


const setupSplit = function() {
  let splitDiv = document.querySelector( '#splitbar' ),
      editor   = document.querySelector( '#editor'   ),
      sidebar  = document.querySelector( '#console'  ),
      mousemove, mouseup

  mouseup = evt => {
    window.removeEventListener( 'mousemove', mousemove )
    window.removeEventListener( 'mouseup', mouseup )
  }

  mousemove = evt => {
    let splitPos = evt.clientX

    editor.style.width = splitPos + 'px'
    sidebar.style.left = splitPos  + 'px'
    sidebar.style.width = (window.innerWidth - splitPos) + 'px'
  }


  splitDiv.addEventListener( 'mousedown', evt => {
    window.addEventListener( 'mousemove', mousemove )
    window.addEventListener( 'mouseup', mouseup )
  })

}

const fixCallback = function( cb ) {
  const cbarr = cb.split( '\n' )
  cbarr.splice(1,1)
  cbarr[0] += ') {'

  return cbarr.join('\n')
}

let shouldUseProxies = false
environment.proxies = []

const createProxies = function( pre, post, proxiedObj ) {
  const newProps = post.filter( prop => pre.indexOf( prop ) === -1 )

  for( let prop of newProps ) {
    let ugen = proxiedObj[ prop ]

    Object.defineProperty( proxiedObj, prop, {
      get() { return ugen },
      set(value) {

        const member = ugen
        if( member !== undefined && value !== undefined) {

          if( typeof member === 'object' && member.__wrapped__ !== undefined ) {
            if( member.__wrapped__.connected !== undefined ) {
              // save copy of connections
              const connected = member.__wrapped__.connected.slice( 0 )
              if( member.disconnect !== undefined ) {
                for( let connection of connected ) {
                  // 0 index is connection target

                  if( connection[0].isProperty === true ) {
                    // if it's a modulation
                    let idx = connection[0].mods.indexOf( ugen )

                    connection[0].mods.splice( idx, 1 )
                  }else{
                    member.disconnect( connection[ 0 ] )
                  }

                  let shouldConnect = true
                  if( connection[0] !== Gibber.Gibberish.output || Gibber.autoConnect === false ) {
                    if( connection[0].isProperty !== true ) {
                      shouldConnect = false
                    }
                    // don't connect new ugen to old ugen's effects chain... new
                    // ugen should have its own chain.
                    if( member.fx.indexOf( connection[0] ) > -1 ) {
                      shouldConnect = false
                    }
                  }

                  if( shouldConnect === true ) {
                    value.connect( connection[ 0 ] )
                  } 
                }

                member.disconnect()
              }
              // check for effects input to copy.
              // XXX should we do this for busses with connected ugens as well???
              // right now we are only connecting new ugens to busses... should we
              // also connect new busses to their prior inputs if proxied?
              if( member.input !== undefined ) {
                value.input = member.input
              }
            }

            // XXX this is supposed to loop through the effecfs of the old ugen, compare them to the fx
            // in the new ugen, and then connect to any destination busses. unfortunately it seems buggy,
            // and I don't feel like fixing at the moment. This means that you have to reconnect effects
            // to busses that aren't the master (or the next effect in an effect chain).

            /*
            if( member.fx !== undefined && member.fx.length > 0 && value.fx !== undefined && value.fx.length > 0 ) {
              for( let i = 0; i < member.fx.length; i++ ) {
                const newEffect = value.fx[ i ]
                if( newEffect !== undefined ) {
                  const oldEffect = member.fx[ i ]

                  for( let j = 0; j < oldEffect.__wrapped__.connected.length; j++ ) {
                    let connection = oldEffect.__wrapped__.connected[ j ][ 0 ]
                    
                    // check to make sure connection is not simply in fx chain...
                    // if it is, it is probably recreatd in as part of a preset, so
                    // don't redo it here.
                    if( member.fx.indexOf( connection ) === -1 ) {
                      newEffect.connect( connection, oldEffect.__wrapped__.connected[ j ][ 1 ] )  
                    }
                  }
                }
              }
            }*/

            // make sure to disconnect any fx in the old ugen's fx chain
            member.fx.forEach( effect => { 
              effect.disconnect()
              effect.clear() 
            })
            member.fx.length = 0
          }
        }

        if( ugen !== undefined ) {
          if( ugen.clear !== undefined ) {
            //ugen.clear()
          }else if( ugen.__onclear !== undefined ) {
            // XXX does this condition ever happen?
            ugen.__onclear()     
          }
        }

        ugen = value
      }
    })

    environment.proxies.push( prop )
  }
}

const shouldUseJSDSP = true

let hidden = false
const toggleGUI = function() {
  hidden = !hidden
  if( hidden === true ) {
    cm.getWrapperElement().style.display = 'none'
  }else{
    cm.getWrapperElement().style.display = 'block'
  }
}

delete CodeMirror.keyMap.default[ 'Ctrl-H' ]

window.addEventListener( 'keydown', e => {
  if( e.key === 'h' && e.ctrlKey === true ) {
    toggleGUI()
  }
})

CodeMirror.keyMap.playground =  {
  fallthrough:'default',

  'Ctrl-Enter'( cm ) {
    try {
      const selectedCode = getSelectionCodeColumn( cm, false )

      window.genish = Gibber.Gen.ugens
      //var code = shouldUseJSDSP ? Babel.transform(selectedCode.code, { presets: [], plugins:['jsdsp'] }).code : selectedCode.code
      let code = `{
  'use jsdsp'
  ${selectedCode.code}
}`
      code = Babel.transform(code, { presets: [], plugins:['jsdsp'] }).code 

      flash( cm, selectedCode.selection )

      const func = new Function( code )

      Gibber.shouldDelay = true

      const preWindowMembers = Object.keys( window )
      func()
      const postWindowMembers = Object.keys( window )

      if( preWindowMembers.length !== postWindowMembers.length ) {
        createProxies( preWindowMembers, postWindowMembers, window )
      }
      
      //const func = new Function( selectedCode.code ).bind( Gibber.currentTrack ),
      const markupFunction = () => {
        Environment.codeMarkup.process( 
          selectedCode.code, 
          selectedCode.selection, 
          cm, 
          Gibber.currentTrack 
        ) 
      }

      markupFunction.origin = func

      if( !Environment.debug ) {
        Gibber.Scheduler.functionsToExecute.push( func )
        if( Environment.annotations === true ) {
          Gibber.Scheduler.functionsToExecute.push( markupFunction  )
        }
      }else{
        //func()
        if( Environment.annotations === true ) markupFunction()
      }
    } catch (e) {
      console.log( e )
      return
    }
    
    Gibber.shouldDelay = false
  },
  'Alt-Enter'( cm ) {
    try {
      var selectedCode = getSelectionCodeColumn( cm, true )

      window.genish = Gibber.Gen.ugens
      //var code = shouldUseJSDSP ? Babel.transform(selectedCode.code, { presets: [], plugins:['jsdsp'] }).code : selectedCode.code
      let code = `{
  'use jsdsp'
  ${selectedCode.code}
}`

      code = Babel.transform(code, { presets: [], plugins:['jsdsp'] }).code 
      flash( cm, selectedCode.selection )

      var func = new Function( code )

      Gibber.shouldDelay = true
      const preWindowMembers = Object.keys( window )
      func()
      const postWindowMembers = Object.keys( window )

      if( preWindowMembers.length !== postWindowMembers.length ) {
        createProxies( preWindowMembers, postWindowMembers, window )
      }

      //const func = new Function( selectedCode.code ).bind( Gibber.currentTrack ),
      const markupFunction = () => {
              Environment.codeMarkup.process( 
                selectedCode.code, 
                selectedCode.selection, 
                cm, 
                Gibber.currentTrack 
              ) 
            }

      markupFunction.origin = func

      if( !Environment.debug ) {
        Gibber.Scheduler.functionsToExecute.push( func )
        if( Environment.annotations === true ) {
          Gibber.Scheduler.functionsToExecute.push( markupFunction  )
        }
      }else{
        //func()
        if( Environment.annotations === true ) markupFunction()
      }

    } catch (e) {
      console.log( e )
      return
    }

    Gibber.shouldDelay = false
  },
  'Ctrl-.'( cm ) {
    Gibber.clear()

    for( let key of environment.proxies ) delete window[ key ]
    environment.proxies.length = 0
    //Gibberish.generateCallback()
    //cmconsole.setValue( fixCallback( Gibberish.callback.toString() ) )
  },
  'Shift-Ctrl-C'(cm) { toggleSidebar() },

  "Shift-Ctrl-=": function(cm) {
    fontSize += .2
    document.querySelector('#editor').style.fontSize = fontSize + 'em'
    document.querySelector('#editor').style.paddingLeft= (fontSize/4) + 'em'
    cm.refresh()
  },

  "Shift-Ctrl--": function(cm) {
    fontSize -= .2
    document.querySelector('#editor').style.fontSize = fontSize + 'em'
    document.querySelector('#editor').style.paddingLeft = (fontSize/4) + 'em'
    cm.refresh()
  },
        
}

const toggleSidebar = () => {
    Environment.sidebar.isVisible = !Environment.sidebar.isVisible
    let editor = document.querySelector( '#editor' )
    if( !Environment.sidebar.isVisible ) {
      Environment.editorWidth = editor.style.width
      editor.style.width = '100%'
    }else{
      editor.style.width = Environment.editorWidth
    }

    Environment.sidebar.style.display = Environment.sidebar.isVisible ? 'block' : 'none'
}
var getSelectionCodeColumn = function( cm, findBlock ) {
  var pos = cm.getCursor(), 
  text = null

  if( !findBlock ) {
    text = cm.getDoc().getSelection()

    if ( text === "") {
      text = cm.getLine( pos.line )
    }else{
      pos = { start: cm.getCursor('start'), end: cm.getCursor('end') }
      //pos = null
    }
  }else{
    var startline = pos.line, 
    endline = pos.line,
    pos1, pos2, sel

    while ( startline > 0 && cm.getLine( startline ) !== "" ) { startline-- }
    while ( endline < cm.lineCount() && cm.getLine( endline ) !== "" ) { endline++ }

    pos1 = { line: startline, ch: 0 }
    pos2 = { line: endline, ch: 0 }

    text = cm.getRange( pos1, pos2 )

    pos = { start: pos1, end: pos2 }
  }

  if( pos.start === undefined ) {
    var lineNumber = pos.line,
    start = 0,
    end = text.length

    pos = { start:{ line:lineNumber, ch:start }, end:{ line:lineNumber, ch: end } }
  }

  return { selection: pos, code: text }
}

var flash = function(cm, pos) {
  var sel,
  cb = function() { sel.clear() }

  if (pos !== null) {
    if( pos.start ) { // if called from a findBlock keymap
      sel = cm.markText( pos.start, pos.end, { className:"CodeMirror-highlight" } );
    }else{ // called with single line
      sel = cm.markText( { line: pos.line, ch:0 }, { line: pos.line, ch:null }, { className: "CodeMirror-highlight" } )
    }
  }else{ // called with selected block
    sel = cm.markText( cm.getCursor(true), cm.getCursor(false), { className: "CodeMirror-highlight" } );
  }

  window.setTimeout(cb, 250);
}

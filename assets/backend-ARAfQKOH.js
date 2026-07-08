var it=Object.defineProperty;var lt=(t,e,n)=>e in t?it(t,e,{enumerable:!0,configurable:!0,writable:!0,value:n}):t[e]=n;var g=(t,e,n)=>lt(t,typeof e!="symbol"?e+"":e,n);import{rpc as D,DropboxError as H,hasTag as Q,upload as I,download as X,getMetadata as ct,mtimeOf as R,getMetadataOrNull as Se,listFolderAll as ut,listFolderContinue as ft,listFolderFull as ht}from"./client-fAEWwCqx.js";import{x as Rr}from"./index-BVEGZ6sD.js";const dt="text-dropbox",E="files",O="kv";let ve=null;function fe(){return ve??(ve=new Promise(t=>{try{const e=indexedDB.open(dt,1);e.onupgradeneeded=()=>{e.result.createObjectStore(E,{keyPath:"pathLower"}),e.result.createObjectStore(O)},e.onsuccess=()=>t(e.result),e.onerror=()=>t(null)}catch{t(null)}})),ve}async function J(t,e,n){const r=await fe();r&&await new Promise(s=>{try{const a=r.transaction(t,e);n(a.objectStore(t)),a.oncomplete=()=>s(),a.onerror=()=>s(),a.onabort=()=>s()}catch{s()}})}async function pt(){const t=await fe();return t?new Promise(e=>{try{const n=t.transaction(E,"readonly").objectStore(E).getAll();n.onsuccess=()=>e(n.result),n.onerror=()=>e([])}catch{e([])}}):[]}const gt=t=>J(E,"readwrite",e=>e.put(t)),bt=t=>J(E,"readwrite",e=>e.delete(t)),Oe=t=>J(E,"readwrite",e=>{e.delete(t),e.delete(IDBKeyRange.bound(`${t}/`,`${t}/￿`))});async function mt(t){const e=await fe();return e?new Promise(n=>{try{const r=e.transaction(O,"readonly").objectStore(O).get(`cursor:${t}`);r.onsuccess=()=>n(r.result??null),r.onerror=()=>n(null)}catch{n(null)}}):null}const $e=(t,e)=>J(O,"readwrite",n=>n.put(e,`cursor:${t}`)),kt=t=>J(O,"readwrite",e=>e.delete(`cursor:${t}`)),Je="text.config",xt=()=>({quick_switch:"ctrl+p",new_note:"ctrl+n",daily_note:"ctrl+shift+d",open_folder:"ctrl+o",switch_folder:"ctrl+shift+o",search:"ctrl+shift+f",backlinks:"ctrl+shift+b",theme:"ctrl+shift+t",editor_font:"ctrl+shift+e",share:"ctrl+shift+s",config:"ctrl+,",shortcuts:"ctrl+/",toggle_sidebar:"ctrl+\\",new_tab:"ctrl+t",close_tab:"ctrl+w",next_tab:"ctrl+tab",prev_tab:"ctrl+shift+tab",new_window:"ctrl+shift+n",split:"ctrl+shift+\\",preview:"ctrl+shift+m",focus_tree:"ctrl+e",calendar:"ctrl+shift+c",zen:"alt+z"}),wt=()=>({theme:"text-dark",font_size:15,ui_font_size:13,editor_font:"",editor_margin:24,line_width:80,line_numbers:!1,highlight_line:!0,vim_mode:!1,single_line_breaks:!1,root:null,recent_roots:[],pinned_roots:[],daily_dir:"daily",image_dir:"",sidebar_width:240,sidebar_right:!1,zen_sidebar:!1,zen_typewriter:!0,typewriter_anchor:"top",keys:xt()});function _t(){const t=wt();try{const e=localStorage.getItem(Je);if(!e)return t;const n=JSON.parse(e);return{...t,...n,keys:{...t.keys,...n.keys??{}}}}catch{return t}}function yt(t){localStorage.setItem(Je,JSON.stringify(t))}const St=new RegExp("(?:^|[\\s([{])#([\\p{L}\\p{N}/_-]*\\p{L}[\\p{L}\\p{N}/_-]*)","gu"),vt=/^\s*(?:[-*+]|\d+[.)])\s+\[( |x|X)\]\s+(.*)$/;function $t(t){var l;const e={},n=[],r=[],s=t.split(`
`);let a=0;if(((l=s[0])==null?void 0:l.trim())==="---")for(a=1;a<s.length;a++){const o=s[a].trim();if(o==="---"||o==="..."){a++;break}const u=o.indexOf(":");if(u<0)continue;const c=o.slice(0,u).trim().toLowerCase(),f=o.slice(u+1).trim().replace(/^["']|["']$/g,"");if(!(!c||c.includes(" "))){if(c==="tags")for(const d of f.split(/[, ]/)){const m=d.trim().replace(/^#/,"").toLowerCase();m&&!n.includes(m)&&n.push(m)}e[c]=f}}let i=null;for(;a<s.length;a++){const o=s[a],u=o.trimStart();if(i){u.startsWith(i)&&(i=null);continue}if(u.startsWith("```")||u.startsWith("~~~")){i=u.slice(0,3);continue}for(const f of o.matchAll(St)){const d=f[1].toLowerCase();n.includes(d)||n.push(d)}const c=vt.exec(o);c&&r.push({text:c[2].trim(),done:c[1]!==" ",line:a+1})}return{fields:e,tags:n,tasks:r}}const Ct=t=>/\.(md|markdown|mdown)$/i.test(t);function he(){return{async:!1,breaks:!1,extensions:null,gfm:!0,hooks:null,pedantic:!1,renderer:null,silent:!1,tokenizer:null,walkTokens:null}}var L=he();function Ve(t){L=t}var A={exec:()=>null};function q(t){let e=[];return n=>{let r=Math.max(0,Math.min(3,n-1)),s=e[r];return s||(s=t(r),e[r]=s),s}}function p(t,e=""){let n=typeof t=="string"?t:t.source,r={replace:(s,a)=>{let i=typeof a=="string"?a:a.source;return i=i.replace(w.caret,"$1"),n=n.replace(s,i),r},getRegex:()=>new RegExp(n,e)};return r}var Rt=((t="")=>{try{return!!new RegExp("(?<=1)(?<!1)"+t)}catch{return!1}})(),w={codeRemoveIndent:/^(?: {1,4}| {0,3}\t)/gm,outputLinkReplace:/\\([\[\]])/g,indentCodeCompensation:/^(\s+)(?:```)/,beginningSpace:/^\s+/,endingHash:/#$/,startingSpaceChar:/^ /,endingSpaceChar:/ $/,nonSpaceChar:/[^ ]/,newLineCharGlobal:/\n/g,tabCharGlobal:/\t/g,multipleSpaceGlobal:/\s+/g,blankLine:/^[ \t]*$/,doubleBlankLine:/\n[ \t]*\n[ \t]*$/,blockquoteStart:/^ {0,3}>/,blockquoteSetextReplace:/\n {0,3}((?:=+|-+) *)(?=\n|$)/g,blockquoteSetextReplace2:/^ {0,3}>[ \t]?/gm,listReplaceNesting:/^ {1,4}(?=( {4})*[^ ])/g,listIsTask:/^\[[ xX]\] +\S/,listReplaceTask:/^\[[ xX]\] +/,listTaskCheckbox:/\[[ xX]\]/,anyLine:/\n.*\n/,hrefBrackets:/^<(.*)>$/,tableDelimiter:/[:|]/,tableAlignChars:/^\||\| *$/g,tableRowBlankLine:/\n[ \t]*$/,tableAlignRight:/^ *-+: *$/,tableAlignCenter:/^ *:-+: *$/,tableAlignLeft:/^ *:-+ *$/,startATag:/^<a /i,endATag:/^<\/a>/i,startPreScriptTag:/^<(pre|code|kbd|script)(\s|>)/i,endPreScriptTag:/^<\/(pre|code|kbd|script)(\s|>)/i,startAngleBracket:/^</,endAngleBracket:/>$/,pedanticHrefTitle:/^([^'"]*[^\s])\s+(['"])(.*)\2/,unicodeAlphaNumeric:/[\p{L}\p{N}]/u,escapeTest:/[&<>"']/,escapeReplace:/[&<>"']/g,escapeTestNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,escapeReplaceNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,caret:/(^|[^\[])\^/g,percentDecode:/%25/g,findPipe:/\|/g,splitPipe:/ \|/,slashPipe:/\\\|/g,carriageReturn:/\r\n|\r/g,spaceLine:/^ +$/gm,notSpaceStart:/^\S*/,endingNewline:/\n$/,listItemRegex:t=>new RegExp(`^( {0,3}${t})((?:[	 ][^\\n]*)?(?:\\n|$))`),nextBulletRegex:q(t=>new RegExp(`^ {0,${t}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`)),hrRegex:q(t=>new RegExp(`^ {0,${t}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`)),fencesBeginRegex:q(t=>new RegExp(`^ {0,${t}}(?:\`\`\`|~~~)`)),headingBeginRegex:q(t=>new RegExp(`^ {0,${t}}#`)),htmlBeginRegex:q(t=>new RegExp(`^ {0,${t}}<(?:[a-z].*>|!--)`,"i")),blockquoteBeginRegex:q(t=>new RegExp(`^ {0,${t}}>`))},Tt=/^(?:[ \t]*(?:\n|$))+/,Mt=/^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/,zt=/^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/,V=/^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/,At=/^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,de=/ {0,3}(?:[*+-]|\d{1,9}[.)])/,Ze=/^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/,We=p(Ze).replace(/bull/g,de).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/\|table/g,"").getRegex(),Bt=p(Ze).replace(/bull/g,de).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/table/g,/ {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(),pe=/^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/,Lt=/^[^\n]+/,ge=/(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/,Dt=p(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label",ge).replace("title",/(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(),qt=p(/^(bull)([ \t][^\n]*?)?(?:\n|$)/).replace(/bull/g,de).getRegex(),ee="address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul",be=/<!--(?:-?>|[\s\S]*?(?:-->|$))/,Et=p("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))","i").replace("comment",be).replace("tag",ee).replace("attribute",/ +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(),Ge=p(pe).replace("hr",V).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("|table","").replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)])[ \\t]+[^ \\t\\n]").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",ee).getRegex(),Pt=p(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph",Ge).getRegex(),me={blockquote:Pt,code:Mt,def:Dt,fences:zt,heading:At,hr:V,html:Et,lheading:We,list:qt,newline:Tt,paragraph:Ge,table:A,text:Lt},Ce=p("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr",V).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("blockquote"," {0,3}>").replace("code","(?: {4}| {0,3}	)[^\\n]").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",ee).getRegex(),jt={...me,lheading:Bt,table:Ce,paragraph:p(pe).replace("hr",V).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("table",Ce).replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)])[ \\t]+[^ \\t\\n]").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",ee).getRegex()},Ft={...me,html:p(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment",be).replace(/tag/g,"(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),def:/^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,heading:/^(#{1,6})(.*)(?:\n+|$)/,fences:A,lheading:/^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,paragraph:p(pe).replace("hr",V).replace("heading",` *#{1,6} *[^
]`).replace("lheading",We).replace("|table","").replace("blockquote"," {0,3}>").replace("|fences","").replace("|list","").replace("|html","").replace("|tag","").getRegex()},It=/^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,Nt=/^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,He=/^( {2,}|\\)\n(?!\s*$)/,Ot=/^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,P=/[\p{P}\p{S}]/u,te=/[\s\p{P}\p{S}]/u,ke=/[^\s\p{P}\p{S}]/u,Jt=p(/^((?![*_])punctSpace)/,"u").replace(/punctSpace/g,te).getRegex(),Qe=/(?!~)[\p{P}\p{S}]/u,Vt=/(?!~)[\s\p{P}\p{S}]/u,Zt=/(?:[^\s\p{P}\p{S}]|~)/u,Wt=p(/link|precode-code|html/,"g").replace("link",/\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-",Rt?"(?<!`)()":"(^^|[^`])").replace("code",/(?<b>`+)[^`]+\k<b>(?!`)/).replace("html",/<(?! )[^<>]*?>/).getRegex(),Xe=/^(?:\*+(?:((?!\*)punct)|([^\s*]))?)|^_+(?:((?!_)punct)|([^\s_]))?/,Gt=p(Xe,"u").replace(/punct/g,P).getRegex(),Ht=p(Xe,"u").replace(/punct/g,Qe).getRegex(),Ue="^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)",Qt=p(Ue,"gu").replace(/notPunctSpace/g,ke).replace(/punctSpace/g,te).replace(/punct/g,P).getRegex(),Xt=p(Ue,"gu").replace(/notPunctSpace/g,Zt).replace(/punctSpace/g,Vt).replace(/punct/g,Qe).getRegex(),Ut=p("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)","gu").replace(/notPunctSpace/g,ke).replace(/punctSpace/g,te).replace(/punct/g,P).getRegex(),Kt=p(/^~~?(?:((?!~)punct)|[^\s~])/,"u").replace(/punct/g,P).getRegex(),Yt="^[^~]+(?=[^~])|(?!~)punct(~~?)(?=[\\s]|$)|notPunctSpace(~~?)(?!~)(?=punctSpace|$)|(?!~)punctSpace(~~?)(?=notPunctSpace)|[\\s](~~?)(?!~)(?=punct)|(?!~)punct(~~?)(?!~)(?=punct)|notPunctSpace(~~?)(?=notPunctSpace)",en=p(Yt,"gu").replace(/notPunctSpace/g,ke).replace(/punctSpace/g,te).replace(/punct/g,P).getRegex(),tn=p(/\\(punct)/,"gu").replace(/punct/g,P).getRegex(),nn=p(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme",/[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email",/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(),rn=p(be).replace("(?:-->|$)","-->").getRegex(),sn=p("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment",rn).replace("attribute",/\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(),U=/(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\])|[^\[\]\\`])*?/,an=p(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]+(?:\n[ \t]*)?|\n[ \t]*)(title))?\s*\)/).replace("label",U).replace("href",/<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title",/"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(),Ke=p(/^!?\[(label)\]\[(ref)\]/).replace("label",U).replace("ref",ge).getRegex(),Ye=p(/^!?\[(ref)\](?:\[\])?/).replace("ref",ge).getRegex(),on=p("reflink|nolink(?!\\()","g").replace("reflink",Ke).replace("nolink",Ye).getRegex(),Re=/[hH][tT][tT][pP][sS]?|[fF][tT][pP]/,xe={_backpedal:A,anyPunctuation:tn,autolink:nn,blockSkip:Wt,br:He,code:Nt,del:A,delLDelim:A,delRDelim:A,emStrongLDelim:Gt,emStrongRDelimAst:Qt,emStrongRDelimUnd:Ut,escape:It,link:an,nolink:Ye,punctuation:Jt,reflink:Ke,reflinkSearch:on,tag:sn,text:Ot,url:A},ln={...xe,link:p(/^!?\[(label)\]\((.*?)\)/).replace("label",U).getRegex(),reflink:p(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label",U).getRegex()},ie={...xe,emStrongRDelimAst:Xt,emStrongLDelim:Ht,delLDelim:Kt,delRDelim:en,url:p(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol",Re).replace("email",/[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),_backpedal:/(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,del:/^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/,text:p(/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol",Re).getRegex()},cn={...ie,br:p(He).replace("{2,}","*").getRegex(),text:p(ie.text).replace("\\b_","\\b_| {2,}\\n").replace(/\{2,\}/g,"*").getRegex()},W={normal:me,gfm:jt,pedantic:Ft},F={normal:xe,gfm:ie,breaks:cn,pedantic:ln},un={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},Te=t=>un[t];function $(t,e){if(e){if(w.escapeTest.test(t))return t.replace(w.escapeReplace,Te)}else if(w.escapeTestNoEncode.test(t))return t.replace(w.escapeReplaceNoEncode,Te);return t}function Me(t){try{t=encodeURI(t).replace(w.percentDecode,"%")}catch{return null}return t}function ze(t,e){var a;let n=t.replace(w.findPipe,(i,l,o)=>{let u=!1,c=l;for(;--c>=0&&o[c]==="\\";)u=!u;return u?"|":" |"}),r=n.split(w.splitPipe),s=0;if(r[0].trim()||r.shift(),r.length>0&&!((a=r.at(-1))!=null&&a.trim())&&r.pop(),e)if(r.length>e)r.splice(e);else for(;r.length<e;)r.push("");for(;s<r.length;s++)r[s]=r[s].trim().replace(w.slashPipe,"|");return r}function M(t,e,n){let r=t.length;if(r===0)return"";let s=0;for(;s<r&&t.charAt(r-s-1)===e;)s++;return t.slice(0,r-s)}function Ae(t){let e=t.split(`
`),n=e.length-1;for(;n>=0&&w.blankLine.test(e[n]);)n--;return e.length-n<=2?t:e.slice(0,n+1).join(`
`)}function fn(t,e){if(t.indexOf(e[1])===-1)return-1;let n=0;for(let r=0;r<t.length;r++)if(t[r]==="\\")r++;else if(t[r]===e[0])n++;else if(t[r]===e[1]&&(n--,n<0))return r;return n>0?-2:-1}function hn(t,e=0){let n=e,r="";for(let s of t)if(s==="	"){let a=4-n%4;r+=" ".repeat(a),n+=a}else r+=s,n++;return r}function Be(t,e,n,r,s){let a=e.href,i=e.title||null,l=t[1].replace(s.other.outputLinkReplace,"$1");r.state.inLink=!0;let o={type:t[0].charAt(0)==="!"?"image":"link",raw:n,href:a,title:i,text:l,tokens:r.inlineTokens(l)};return r.state.inLink=!1,o}function dn(t,e,n){let r=t.match(n.other.indentCodeCompensation);if(r===null)return e;let s=r[1];return e.split(`
`).map(a=>{let i=a.match(n.other.beginningSpace);if(i===null)return a;let[l]=i;return l.length>=s.length?a.slice(s.length):a}).join(`
`)}var K=class{constructor(t){g(this,"options");g(this,"rules");g(this,"lexer");this.options=t||L}space(t){let e=this.rules.block.newline.exec(t);if(e&&e[0].length>0)return{type:"space",raw:e[0]}}code(t){let e=this.rules.block.code.exec(t);if(e){let n=this.options.pedantic?e[0]:Ae(e[0]),r=n.replace(this.rules.other.codeRemoveIndent,"");return{type:"code",raw:n,codeBlockStyle:"indented",text:r}}}fences(t){let e=this.rules.block.fences.exec(t);if(e){let n=e[0],r=dn(n,e[3]||"",this.rules);return{type:"code",raw:n,lang:e[2]?e[2].trim().replace(this.rules.inline.anyPunctuation,"$1"):e[2],text:r}}}heading(t){let e=this.rules.block.heading.exec(t);if(e){let n=e[2].trim();if(this.rules.other.endingHash.test(n)){let r=M(n,"#");(this.options.pedantic||!r||this.rules.other.endingSpaceChar.test(r))&&(n=r.trim())}return{type:"heading",raw:M(e[0],`
`),depth:e[1].length,text:n,tokens:this.lexer.inline(n)}}}hr(t){let e=this.rules.block.hr.exec(t);if(e)return{type:"hr",raw:M(e[0],`
`)}}blockquote(t){let e=this.rules.block.blockquote.exec(t);if(e){let n=M(e[0],`
`).split(`
`),r="",s="",a=[];for(;n.length>0;){let i=!1,l=[],o;for(o=0;o<n.length;o++)if(this.rules.other.blockquoteStart.test(n[o]))l.push(n[o]),i=!0;else if(!i)l.push(n[o]);else break;n=n.slice(o);let u=l.join(`
`),c=u.replace(this.rules.other.blockquoteSetextReplace,`
    $1`).replace(this.rules.other.blockquoteSetextReplace2,"");r=r?`${r}
${u}`:u,s=s?`${s}
${c}`:c;let f=this.lexer.state.top;if(this.lexer.state.top=!0,this.lexer.blockTokens(c,a,!0),this.lexer.state.top=f,n.length===0)break;let d=a.at(-1);if((d==null?void 0:d.type)==="code")break;if((d==null?void 0:d.type)==="blockquote"){let m=d,h=m.raw+`
`+n.join(`
`),_=this.blockquote(h);a[a.length-1]=_,r=r.substring(0,r.length-m.raw.length)+_.raw,s=s.substring(0,s.length-m.text.length)+_.text;break}else if((d==null?void 0:d.type)==="list"){let m=d,h=m.raw+`
`+n.join(`
`),_=this.list(h);a[a.length-1]=_,r=r.substring(0,r.length-d.raw.length)+_.raw,s=s.substring(0,s.length-m.raw.length)+_.raw,n=h.substring(a.at(-1).raw.length).split(`
`);continue}}return{type:"blockquote",raw:r,tokens:a,text:s}}}list(t){let e=this.rules.block.list.exec(t);if(e){let n=e[1].trim(),r=n.length>1,s={type:"list",raw:"",ordered:r,start:r?+n.slice(0,-1):"",loose:!1,items:[]};n=r?`\\d{1,9}\\${n.slice(-1)}`:`\\${n}`,this.options.pedantic&&(n=r?n:"[*+-]");let a=this.rules.other.listItemRegex(n),i=!1;for(;t;){let o=!1,u="",c="";if(!(e=a.exec(t))||this.rules.block.hr.test(t))break;u=e[0],t=t.substring(u.length);let f=hn(e[2].split(`
`,1)[0],e[1].length),d=t.split(`
`,1)[0],m=!f.trim(),h=0;if(this.options.pedantic?(h=2,c=f.trimStart()):m?h=e[1].length+1:(h=f.search(this.rules.other.nonSpaceChar),h=h>4?1:h,c=f.slice(h),h+=e[1].length),m&&this.rules.other.blankLine.test(d)&&(u+=d+`
`,t=t.substring(d.length+1),o=!0),!o){let _=this.rules.other.nextBulletRegex(h),x=this.rules.other.hrRegex(h),Z=this.rules.other.fencesBeginRegex(h),z=this.rules.other.headingBeginRegex(h),re=this.rules.other.htmlBeginRegex(h),ot=this.rules.other.blockquoteBeginRegex(h);for(;t;){let se=t.split(`
`,1)[0],j;if(d=se,this.options.pedantic?(d=d.replace(this.rules.other.listReplaceNesting,"  "),j=d):j=d.replace(this.rules.other.tabCharGlobal,"    "),Z.test(d)||z.test(d)||re.test(d)||ot.test(d)||_.test(d)||x.test(d))break;if(j.search(this.rules.other.nonSpaceChar)>=h||!d.trim())c+=`
`+j.slice(h);else{if(m||f.replace(this.rules.other.tabCharGlobal,"    ").search(this.rules.other.nonSpaceChar)>=4||Z.test(f)||z.test(f)||x.test(f))break;c+=`
`+d}m=!d.trim(),u+=se+`
`,t=t.substring(se.length+1),f=j.slice(h)}}s.loose||(i?s.loose=!0:this.rules.other.doubleBlankLine.test(u)&&(i=!0)),s.items.push({type:"list_item",raw:u,task:!!this.options.gfm&&this.rules.other.listIsTask.test(c),loose:!1,text:c,tokens:[]}),s.raw+=u}let l=s.items.at(-1);if(l)l.raw=l.raw.trimEnd(),l.text=l.text.trimEnd();else return;s.raw=s.raw.trimEnd();for(let o of s.items){this.lexer.state.top=!1,o.tokens=this.lexer.blockTokens(o.text,[]);let u=o.tokens[0];if(o.task&&((u==null?void 0:u.type)==="text"||(u==null?void 0:u.type)==="paragraph")){o.text=o.text.replace(this.rules.other.listReplaceTask,""),u.raw=u.raw.replace(this.rules.other.listReplaceTask,""),u.text=u.text.replace(this.rules.other.listReplaceTask,"");for(let f=this.lexer.inlineQueue.length-1;f>=0;f--)if(this.rules.other.listIsTask.test(this.lexer.inlineQueue[f].src)){this.lexer.inlineQueue[f].src=this.lexer.inlineQueue[f].src.replace(this.rules.other.listReplaceTask,"");break}let c=this.rules.other.listTaskCheckbox.exec(o.raw);if(c){let f={type:"checkbox",raw:c[0]+" ",checked:c[0]!=="[ ]"};o.checked=f.checked,s.loose?o.tokens[0]&&["paragraph","text"].includes(o.tokens[0].type)&&"tokens"in o.tokens[0]&&o.tokens[0].tokens?(o.tokens[0].raw=f.raw+o.tokens[0].raw,o.tokens[0].text=f.raw+o.tokens[0].text,o.tokens[0].tokens.unshift(f)):o.tokens.unshift({type:"paragraph",raw:f.raw,text:f.raw,tokens:[f]}):o.tokens.unshift(f)}}else o.task&&(o.task=!1);if(!s.loose){let c=o.tokens.filter(d=>d.type==="space"),f=c.length>0&&c.some(d=>this.rules.other.anyLine.test(d.raw));s.loose=f}}if(s.loose)for(let o of s.items){o.loose=!0;for(let u of o.tokens)u.type==="text"&&(u.type="paragraph")}return s}}html(t){let e=this.rules.block.html.exec(t);if(e){let n=Ae(e[0]);return{type:"html",block:!0,raw:n,pre:e[1]==="pre"||e[1]==="script"||e[1]==="style",text:n}}}def(t){let e=this.rules.block.def.exec(t);if(e){let n=e[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal," "),r=e[2]?e[2].replace(this.rules.other.hrefBrackets,"$1").replace(this.rules.inline.anyPunctuation,"$1"):"",s=e[3]?e[3].substring(1,e[3].length-1).replace(this.rules.inline.anyPunctuation,"$1"):e[3];return{type:"def",tag:n,raw:M(e[0],`
`),href:r,title:s}}}table(t){var i;let e=this.rules.block.table.exec(t);if(!e||!this.rules.other.tableDelimiter.test(e[2]))return;let n=ze(e[1]),r=e[2].replace(this.rules.other.tableAlignChars,"").split("|"),s=(i=e[3])!=null&&i.trim()?e[3].replace(this.rules.other.tableRowBlankLine,"").split(`
`):[],a={type:"table",raw:M(e[0],`
`),header:[],align:[],rows:[]};if(n.length===r.length){for(let l of r)this.rules.other.tableAlignRight.test(l)?a.align.push("right"):this.rules.other.tableAlignCenter.test(l)?a.align.push("center"):this.rules.other.tableAlignLeft.test(l)?a.align.push("left"):a.align.push(null);for(let l=0;l<n.length;l++)a.header.push({text:n[l],tokens:this.lexer.inline(n[l]),header:!0,align:a.align[l]});for(let l of s)a.rows.push(ze(l,a.header.length).map((o,u)=>({text:o,tokens:this.lexer.inline(o),header:!1,align:a.align[u]})));return a}}lheading(t){let e=this.rules.block.lheading.exec(t);if(e){let n=e[1].trim();return{type:"heading",raw:M(e[0],`
`),depth:e[2].charAt(0)==="="?1:2,text:n,tokens:this.lexer.inline(n)}}}paragraph(t){let e=this.rules.block.paragraph.exec(t);if(e){let n=e[1].charAt(e[1].length-1)===`
`?e[1].slice(0,-1):e[1];return{type:"paragraph",raw:e[0],text:n,tokens:this.lexer.inline(n)}}}text(t){let e=this.rules.block.text.exec(t);if(e)return{type:"text",raw:e[0],text:e[0],tokens:this.lexer.inline(e[0])}}escape(t){let e=this.rules.inline.escape.exec(t);if(e)return{type:"escape",raw:e[0],text:e[1]}}tag(t){let e=this.rules.inline.tag.exec(t);if(e)return!this.lexer.state.inLink&&this.rules.other.startATag.test(e[0])?this.lexer.state.inLink=!0:this.lexer.state.inLink&&this.rules.other.endATag.test(e[0])&&(this.lexer.state.inLink=!1),!this.lexer.state.inRawBlock&&this.rules.other.startPreScriptTag.test(e[0])?this.lexer.state.inRawBlock=!0:this.lexer.state.inRawBlock&&this.rules.other.endPreScriptTag.test(e[0])&&(this.lexer.state.inRawBlock=!1),{type:"html",raw:e[0],inLink:this.lexer.state.inLink,inRawBlock:this.lexer.state.inRawBlock,block:!1,text:e[0]}}link(t){let e=this.rules.inline.link.exec(t);if(e){let n=e[2].trim();if(!this.options.pedantic&&this.rules.other.startAngleBracket.test(n)){if(!this.rules.other.endAngleBracket.test(n))return;let a=M(n.slice(0,-1),"\\");if((n.length-a.length)%2===0)return}else{let a=fn(e[2],"()");if(a===-2)return;if(a>-1){let i=(e[0].indexOf("!")===0?5:4)+e[1].length+a;e[2]=e[2].substring(0,a),e[0]=e[0].substring(0,i).trim(),e[3]=""}}let r=e[2],s="";if(this.options.pedantic){let a=this.rules.other.pedanticHrefTitle.exec(r);a&&(r=a[1],s=a[3])}else s=e[3]?e[3].slice(1,-1):"";return r=r.trim(),this.rules.other.startAngleBracket.test(r)&&(this.options.pedantic&&!this.rules.other.endAngleBracket.test(n)?r=r.slice(1):r=r.slice(1,-1)),Be(e,{href:r&&r.replace(this.rules.inline.anyPunctuation,"$1"),title:s&&s.replace(this.rules.inline.anyPunctuation,"$1")},e[0],this.lexer,this.rules)}}reflink(t,e){let n;if((n=this.rules.inline.reflink.exec(t))||(n=this.rules.inline.nolink.exec(t))){let r=(n[2]||n[1]).replace(this.rules.other.multipleSpaceGlobal," "),s=e[r.toLowerCase()];if(!s){let a=n[0].charAt(0);return{type:"text",raw:a,text:a}}return Be(n,s,n[0],this.lexer,this.rules)}}emStrong(t,e,n=""){let r=this.rules.inline.emStrongLDelim.exec(t);if(!(!r||!r[1]&&!r[2]&&!r[3]&&!r[4]||r[4]&&n.match(this.rules.other.unicodeAlphaNumeric))&&(!(r[1]||r[3])||!n||this.rules.inline.punctuation.exec(n))){let s=[...r[0]].length-1,a,i,l=s,o=0,u=r[0][0]==="*"?this.rules.inline.emStrongRDelimAst:this.rules.inline.emStrongRDelimUnd;for(u.lastIndex=0,e=e.slice(-1*t.length+s);(r=u.exec(e))!==null;){if(a=r[1]||r[2]||r[3]||r[4]||r[5]||r[6],!a)continue;if(i=[...a].length,r[3]||r[4]){l+=i;continue}else if((r[5]||r[6])&&s%3&&!((s+i)%3)){o+=i;continue}if(l-=i,l>0)continue;i=Math.min(i,i+l+o);let c=[...r[0]][0].length,f=t.slice(0,s+r.index+c+i);if(Math.min(s,i)%2){let m=f.slice(1,-1);return{type:"em",raw:f,text:m,tokens:this.lexer.inlineTokens(m)}}let d=f.slice(2,-2);return{type:"strong",raw:f,text:d,tokens:this.lexer.inlineTokens(d)}}}}codespan(t){let e=this.rules.inline.code.exec(t);if(e){let n=e[2].replace(this.rules.other.newLineCharGlobal," "),r=this.rules.other.nonSpaceChar.test(n),s=this.rules.other.startingSpaceChar.test(n)&&this.rules.other.endingSpaceChar.test(n);return r&&s&&(n=n.substring(1,n.length-1)),{type:"codespan",raw:e[0],text:n}}}br(t){let e=this.rules.inline.br.exec(t);if(e)return{type:"br",raw:e[0]}}del(t,e,n=""){let r=this.rules.inline.delLDelim.exec(t);if(r&&(!r[1]||!n||this.rules.inline.punctuation.exec(n))){let s=[...r[0]].length-1,a,i,l=s,o=this.rules.inline.delRDelim;for(o.lastIndex=0,e=e.slice(-1*t.length+s);(r=o.exec(e))!==null;){if(a=r[1]||r[2]||r[3]||r[4]||r[5]||r[6],!a||(i=[...a].length,i!==s))continue;if(r[3]||r[4]){l+=i;continue}if(l-=i,l>0)continue;i=Math.min(i,i+l);let u=[...r[0]][0].length,c=t.slice(0,s+r.index+u+i),f=c.slice(s,-s);return{type:"del",raw:c,text:f,tokens:this.lexer.inlineTokens(f)}}}}autolink(t){let e=this.rules.inline.autolink.exec(t);if(e){let n,r;return e[2]==="@"?(n=e[1],r="mailto:"+n):(n=e[1],r=n),{type:"link",raw:e[0],text:n,href:r,tokens:[{type:"text",raw:n,text:n}]}}}url(t){var n;let e;if(e=this.rules.inline.url.exec(t)){let r,s;if(e[2]==="@")r=e[0],s="mailto:"+r;else{let a;do a=e[0],e[0]=((n=this.rules.inline._backpedal.exec(e[0]))==null?void 0:n[0])??"";while(a!==e[0]);r=e[0],e[1]==="www."?s="http://"+e[0]:s=e[0]}return{type:"link",raw:e[0],text:r,href:s,tokens:[{type:"text",raw:r,text:r}]}}}inlineText(t){let e=this.rules.inline.text.exec(t);if(e){let n=this.lexer.state.inRawBlock;return{type:"text",raw:e[0],text:e[0],escaped:n}}}},y=class le{constructor(e){g(this,"tokens");g(this,"options");g(this,"state");g(this,"inlineQueue");g(this,"tokenizer");this.tokens=[],this.tokens.links=Object.create(null),this.options=e||L,this.options.tokenizer=this.options.tokenizer||new K,this.tokenizer=this.options.tokenizer,this.tokenizer.options=this.options,this.tokenizer.lexer=this,this.inlineQueue=[],this.state={inLink:!1,inRawBlock:!1,top:!0};let n={other:w,block:W.normal,inline:F.normal};this.options.pedantic?(n.block=W.pedantic,n.inline=F.pedantic):this.options.gfm&&(n.block=W.gfm,this.options.breaks?n.inline=F.breaks:n.inline=F.gfm),this.tokenizer.rules=n}static get rules(){return{block:W,inline:F}}static lex(e,n){return new le(n).lex(e)}static lexInline(e,n){return new le(n).inlineTokens(e)}lex(e){e=e.replace(w.carriageReturn,`
`),this.blockTokens(e,this.tokens);for(let n=0;n<this.inlineQueue.length;n++){let r=this.inlineQueue[n];this.inlineTokens(r.src,r.tokens)}return this.inlineQueue=[],this.tokens}blockTokens(e,n=[],r=!1){var a,i,l;this.tokenizer.lexer=this,this.options.pedantic&&(e=e.replace(w.tabCharGlobal,"    ").replace(w.spaceLine,""));let s=1/0;for(;e;){if(e.length<s)s=e.length;else{this.infiniteLoopError(e.charCodeAt(0));break}let o;if((i=(a=this.options.extensions)==null?void 0:a.block)!=null&&i.some(c=>(o=c.call({lexer:this},e,n))?(e=e.substring(o.raw.length),n.push(o),!0):!1))continue;if(o=this.tokenizer.space(e)){e=e.substring(o.raw.length);let c=n.at(-1);o.raw.length===1&&c!==void 0?c.raw+=`
`:n.push(o);continue}if(o=this.tokenizer.code(e)){e=e.substring(o.raw.length);let c=n.at(-1);(c==null?void 0:c.type)==="paragraph"||(c==null?void 0:c.type)==="text"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+o.raw,c.text+=`
`+o.text,this.inlineQueue.at(-1).src=c.text):n.push(o);continue}if(o=this.tokenizer.fences(e)){e=e.substring(o.raw.length),n.push(o);continue}if(o=this.tokenizer.heading(e)){e=e.substring(o.raw.length),n.push(o);continue}if(o=this.tokenizer.hr(e)){e=e.substring(o.raw.length),n.push(o);continue}if(o=this.tokenizer.blockquote(e)){e=e.substring(o.raw.length),n.push(o);continue}if(o=this.tokenizer.list(e)){e=e.substring(o.raw.length),n.push(o);continue}if(o=this.tokenizer.html(e)){e=e.substring(o.raw.length),n.push(o);continue}if(o=this.tokenizer.def(e)){e=e.substring(o.raw.length);let c=n.at(-1);(c==null?void 0:c.type)==="paragraph"||(c==null?void 0:c.type)==="text"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+o.raw,c.text+=`
`+o.raw,this.inlineQueue.at(-1).src=c.text):this.tokens.links[o.tag]||(this.tokens.links[o.tag]={href:o.href,title:o.title},n.push(o));continue}if(o=this.tokenizer.table(e)){e=e.substring(o.raw.length),n.push(o);continue}if(o=this.tokenizer.lheading(e)){e=e.substring(o.raw.length),n.push(o);continue}let u=e;if((l=this.options.extensions)!=null&&l.startBlock){let c=1/0,f=e.slice(1),d;this.options.extensions.startBlock.forEach(m=>{d=m.call({lexer:this},f),typeof d=="number"&&d>=0&&(c=Math.min(c,d))}),c<1/0&&c>=0&&(u=e.substring(0,c+1))}if(this.state.top&&(o=this.tokenizer.paragraph(u))){let c=n.at(-1);r&&(c==null?void 0:c.type)==="paragraph"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+o.raw,c.text+=`
`+o.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=c.text):n.push(o),r=u.length!==e.length,e=e.substring(o.raw.length);continue}if(o=this.tokenizer.text(e)){e=e.substring(o.raw.length);let c=n.at(-1);(c==null?void 0:c.type)==="text"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+o.raw,c.text+=`
`+o.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=c.text):n.push(o);continue}if(e){this.infiniteLoopError(e.charCodeAt(0));break}}return this.state.top=!0,n}inline(e,n=[]){return this.inlineQueue.push({src:e,tokens:n}),n}inlineTokens(e,n=[]){var u,c,f,d,m;this.tokenizer.lexer=this;let r=e,s=null;if(this.tokens.links){let h=Object.keys(this.tokens.links);if(h.length>0)for(;(s=this.tokenizer.rules.inline.reflinkSearch.exec(r))!==null;)h.includes(s[0].slice(s[0].lastIndexOf("[")+1,-1))&&(r=r.slice(0,s.index)+"["+"a".repeat(s[0].length-2)+"]"+r.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex))}for(;(s=this.tokenizer.rules.inline.anyPunctuation.exec(r))!==null;)r=r.slice(0,s.index)+"++"+r.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);let a;for(;(s=this.tokenizer.rules.inline.blockSkip.exec(r))!==null;)a=s[2]?s[2].length:0,r=r.slice(0,s.index+a)+"["+"a".repeat(s[0].length-a-2)+"]"+r.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);r=((c=(u=this.options.hooks)==null?void 0:u.emStrongMask)==null?void 0:c.call({lexer:this},r))??r;let i=!1,l="",o=1/0;for(;e;){if(e.length<o)o=e.length;else{this.infiniteLoopError(e.charCodeAt(0));break}i||(l=""),i=!1;let h;if((d=(f=this.options.extensions)==null?void 0:f.inline)!=null&&d.some(x=>(h=x.call({lexer:this},e,n))?(e=e.substring(h.raw.length),n.push(h),!0):!1))continue;if(h=this.tokenizer.escape(e)){e=e.substring(h.raw.length),n.push(h);continue}if(h=this.tokenizer.tag(e)){e=e.substring(h.raw.length),n.push(h);continue}if(h=this.tokenizer.link(e)){e=e.substring(h.raw.length),n.push(h);continue}if(h=this.tokenizer.reflink(e,this.tokens.links)){e=e.substring(h.raw.length);let x=n.at(-1);h.type==="text"&&(x==null?void 0:x.type)==="text"?(x.raw+=h.raw,x.text+=h.text):n.push(h);continue}if(h=this.tokenizer.emStrong(e,r,l)){e=e.substring(h.raw.length),n.push(h);continue}if(h=this.tokenizer.codespan(e)){e=e.substring(h.raw.length),n.push(h);continue}if(h=this.tokenizer.br(e)){e=e.substring(h.raw.length),n.push(h);continue}if(h=this.tokenizer.del(e,r,l)){e=e.substring(h.raw.length),n.push(h);continue}if(h=this.tokenizer.autolink(e)){e=e.substring(h.raw.length),n.push(h);continue}if(!this.state.inLink&&(h=this.tokenizer.url(e))){e=e.substring(h.raw.length),n.push(h);continue}let _=e;if((m=this.options.extensions)!=null&&m.startInline){let x=1/0,Z=e.slice(1),z;this.options.extensions.startInline.forEach(re=>{z=re.call({lexer:this},Z),typeof z=="number"&&z>=0&&(x=Math.min(x,z))}),x<1/0&&x>=0&&(_=e.substring(0,x+1))}if(h=this.tokenizer.inlineText(_)){e=e.substring(h.raw.length),h.raw.slice(-1)!=="_"&&(l=h.raw.slice(-1)),i=!0;let x=n.at(-1);(x==null?void 0:x.type)==="text"?(x.raw+=h.raw,x.text+=h.text):n.push(h);continue}if(e){this.infiniteLoopError(e.charCodeAt(0));break}}return n}infiniteLoopError(e){let n="Infinite loop on byte: "+e;if(this.options.silent)console.error(n);else throw new Error(n)}},Y=class{constructor(t){g(this,"options");g(this,"parser");this.options=t||L}space(t){return""}code({text:t,lang:e,escaped:n}){var a;let r=(a=(e||"").match(w.notSpaceStart))==null?void 0:a[0],s=t.replace(w.endingNewline,"")+`
`;return r?'<pre><code class="language-'+$(r)+'">'+(n?s:$(s,!0))+`</code></pre>
`:"<pre><code>"+(n?s:$(s,!0))+`</code></pre>
`}blockquote({tokens:t}){return`<blockquote>
${this.parser.parse(t)}</blockquote>
`}html({text:t}){return t}def(t){return""}heading({tokens:t,depth:e}){return`<h${e}>${this.parser.parseInline(t)}</h${e}>
`}hr(t){return`<hr>
`}list(t){let e=t.ordered,n=t.start,r="";for(let i=0;i<t.items.length;i++){let l=t.items[i];r+=this.listitem(l)}let s=e?"ol":"ul",a=e&&n!==1?' start="'+n+'"':"";return"<"+s+a+`>
`+r+"</"+s+`>
`}listitem(t){return`<li>${this.parser.parse(t.tokens)}</li>
`}checkbox({checked:t}){return"<input "+(t?'checked="" ':"")+'disabled="" type="checkbox"> '}paragraph({tokens:t}){return`<p>${this.parser.parseInline(t)}</p>
`}table(t){let e="",n="";for(let s=0;s<t.header.length;s++)n+=this.tablecell(t.header[s]);e+=this.tablerow({text:n});let r="";for(let s=0;s<t.rows.length;s++){let a=t.rows[s];n="";for(let i=0;i<a.length;i++)n+=this.tablecell(a[i]);r+=this.tablerow({text:n})}return r&&(r=`<tbody>${r}</tbody>`),`<table>
<thead>
`+e+`</thead>
`+r+`</table>
`}tablerow({text:t}){return`<tr>
${t}</tr>
`}tablecell(t){let e=this.parser.parseInline(t.tokens),n=t.header?"th":"td";return(t.align?`<${n} align="${t.align}">`:`<${n}>`)+e+`</${n}>
`}strong({tokens:t}){return`<strong>${this.parser.parseInline(t)}</strong>`}em({tokens:t}){return`<em>${this.parser.parseInline(t)}</em>`}codespan({text:t}){return`<code>${$(t,!0)}</code>`}br(t){return"<br>"}del({tokens:t}){return`<del>${this.parser.parseInline(t)}</del>`}link({href:t,title:e,tokens:n}){let r=this.parser.parseInline(n),s=Me(t);if(s===null)return r;t=s;let a='<a href="'+t+'"';return e&&(a+=' title="'+$(e)+'"'),a+=">"+r+"</a>",a}image({href:t,title:e,text:n,tokens:r}){r&&(n=this.parser.parseInline(r,this.parser.textRenderer));let s=Me(t);if(s===null)return $(n);t=s;let a=`<img src="${t}" alt="${$(n)}"`;return e&&(a+=` title="${$(e)}"`),a+=">",a}text(t){return"tokens"in t&&t.tokens?this.parser.parseInline(t.tokens):"escaped"in t&&t.escaped?t.text:$(t.text)}},we=class{strong({text:t}){return t}em({text:t}){return t}codespan({text:t}){return t}del({text:t}){return t}html({text:t}){return t}text({text:t}){return t}link({text:t}){return""+t}image({text:t}){return""+t}br(){return""}checkbox({raw:t}){return t}},S=class ce{constructor(e){g(this,"options");g(this,"renderer");g(this,"textRenderer");this.options=e||L,this.options.renderer=this.options.renderer||new Y,this.renderer=this.options.renderer,this.renderer.options=this.options,this.renderer.parser=this,this.textRenderer=new we}static parse(e,n){return new ce(n).parse(e)}static parseInline(e,n){return new ce(n).parseInline(e)}parse(e){var r,s;this.renderer.parser=this;let n="";for(let a=0;a<e.length;a++){let i=e[a];if((s=(r=this.options.extensions)==null?void 0:r.renderers)!=null&&s[i.type]){let o=i,u=this.options.extensions.renderers[o.type].call({parser:this},o);if(u!==!1||!["space","hr","heading","code","table","blockquote","list","html","def","paragraph","text"].includes(o.type)){n+=u||"";continue}}let l=i;switch(l.type){case"space":{n+=this.renderer.space(l);break}case"hr":{n+=this.renderer.hr(l);break}case"heading":{n+=this.renderer.heading(l);break}case"code":{n+=this.renderer.code(l);break}case"table":{n+=this.renderer.table(l);break}case"blockquote":{n+=this.renderer.blockquote(l);break}case"list":{n+=this.renderer.list(l);break}case"checkbox":{n+=this.renderer.checkbox(l);break}case"html":{n+=this.renderer.html(l);break}case"def":{n+=this.renderer.def(l);break}case"paragraph":{n+=this.renderer.paragraph(l);break}case"text":{n+=this.renderer.text(l);break}default:{let o='Token with "'+l.type+'" type was not found.';if(this.options.silent)return console.error(o),"";throw new Error(o)}}}return n}parseInline(e,n=this.renderer){var s,a;this.renderer.parser=this;let r="";for(let i=0;i<e.length;i++){let l=e[i];if((a=(s=this.options.extensions)==null?void 0:s.renderers)!=null&&a[l.type]){let u=this.options.extensions.renderers[l.type].call({parser:this},l);if(u!==!1||!["escape","html","link","image","strong","em","codespan","br","del","text"].includes(l.type)){r+=u||"";continue}}let o=l;switch(o.type){case"escape":{r+=n.text(o);break}case"html":{r+=n.html(o);break}case"link":{r+=n.link(o);break}case"image":{r+=n.image(o);break}case"checkbox":{r+=n.checkbox(o);break}case"strong":{r+=n.strong(o);break}case"em":{r+=n.em(o);break}case"codespan":{r+=n.codespan(o);break}case"br":{r+=n.br(o);break}case"del":{r+=n.del(o);break}case"text":{r+=n.text(o);break}default:{let u='Token with "'+o.type+'" type was not found.';if(this.options.silent)return console.error(u),"";throw new Error(u)}}}return r}},G,N=(G=class{constructor(t){g(this,"options");g(this,"block");this.options=t||L}preprocess(t){return t}postprocess(t){return t}processAllTokens(t){return t}emStrongMask(t){return t}provideLexer(t=this.block){return t?y.lex:y.lexInline}provideParser(t=this.block){return t?S.parse:S.parseInline}},g(G,"passThroughHooks",new Set(["preprocess","postprocess","processAllTokens","emStrongMask"])),g(G,"passThroughHooksRespectAsync",new Set(["preprocess","postprocess","processAllTokens"])),G),et=class{constructor(...t){g(this,"defaults",he());g(this,"options",this.setOptions);g(this,"parse",this.parseMarkdown(!0));g(this,"parseInline",this.parseMarkdown(!1));g(this,"Parser",S);g(this,"Renderer",Y);g(this,"TextRenderer",we);g(this,"Lexer",y);g(this,"Tokenizer",K);g(this,"Hooks",N);this.use(...t)}walkTokens(t,e){var r,s;let n=[];for(let a of t)switch(n=n.concat(e.call(this,a)),a.type){case"table":{let i=a;for(let l of i.header)n=n.concat(this.walkTokens(l.tokens,e));for(let l of i.rows)for(let o of l)n=n.concat(this.walkTokens(o.tokens,e));break}case"list":{let i=a;n=n.concat(this.walkTokens(i.items,e));break}default:{let i=a;(s=(r=this.defaults.extensions)==null?void 0:r.childTokens)!=null&&s[i.type]?this.defaults.extensions.childTokens[i.type].forEach(l=>{let o=i[l].flat(1/0);n=n.concat(this.walkTokens(o,e))}):i.tokens&&(n=n.concat(this.walkTokens(i.tokens,e)))}}return n}use(...t){let e=this.defaults.extensions||{renderers:{},childTokens:{}};return t.forEach(n=>{let r={...n};if(r.async=this.defaults.async||r.async||!1,n.extensions&&(n.extensions.forEach(s=>{if(!s.name)throw new Error("extension name required");if("renderer"in s){let a=e.renderers[s.name];a?e.renderers[s.name]=function(...i){let l=s.renderer.apply(this,i);return l===!1&&(l=a.apply(this,i)),l}:e.renderers[s.name]=s.renderer}if("tokenizer"in s){if(!s.level||s.level!=="block"&&s.level!=="inline")throw new Error("extension level must be 'block' or 'inline'");let a=e[s.level];a?a.unshift(s.tokenizer):e[s.level]=[s.tokenizer],s.start&&(s.level==="block"?e.startBlock?e.startBlock.push(s.start):e.startBlock=[s.start]:s.level==="inline"&&(e.startInline?e.startInline.push(s.start):e.startInline=[s.start]))}"childTokens"in s&&s.childTokens&&(e.childTokens[s.name]=s.childTokens)}),r.extensions=e),n.renderer){let s=this.defaults.renderer||new Y(this.defaults);for(let a in n.renderer){if(!(a in s))throw new Error(`renderer '${a}' does not exist`);if(["options","parser"].includes(a))continue;let i=a,l=n.renderer[i],o=s[i];s[i]=(...u)=>{let c=l.apply(s,u);return c===!1&&(c=o.apply(s,u)),c||""}}r.renderer=s}if(n.tokenizer){let s=this.defaults.tokenizer||new K(this.defaults);for(let a in n.tokenizer){if(!(a in s))throw new Error(`tokenizer '${a}' does not exist`);if(["options","rules","lexer"].includes(a))continue;let i=a,l=n.tokenizer[i],o=s[i];s[i]=(...u)=>{let c=l.apply(s,u);return c===!1&&(c=o.apply(s,u)),c}}r.tokenizer=s}if(n.hooks){let s=this.defaults.hooks||new N;for(let a in n.hooks){if(!(a in s))throw new Error(`hook '${a}' does not exist`);if(["options","block"].includes(a))continue;let i=a,l=n.hooks[i],o=s[i];N.passThroughHooks.has(a)?s[i]=u=>{if(this.defaults.async&&N.passThroughHooksRespectAsync.has(a))return(async()=>{let f=await l.call(s,u);return o.call(s,f)})();let c=l.call(s,u);return o.call(s,c)}:s[i]=(...u)=>{if(this.defaults.async)return(async()=>{let f=await l.apply(s,u);return f===!1&&(f=await o.apply(s,u)),f})();let c=l.apply(s,u);return c===!1&&(c=o.apply(s,u)),c}}r.hooks=s}if(n.walkTokens){let s=this.defaults.walkTokens,a=n.walkTokens;r.walkTokens=function(i){let l=[];return l.push(a.call(this,i)),s&&(l=l.concat(s.call(this,i))),l}}this.defaults={...this.defaults,...r}}),this}setOptions(t){return this.defaults={...this.defaults,...t},this}lexer(t,e){return y.lex(t,e??this.defaults)}parser(t,e){return S.parse(t,e??this.defaults)}parseMarkdown(t){return(e,n)=>{let r={...n},s={...this.defaults,...r},a=this.onError(!!s.silent,!!s.async);if(this.defaults.async===!0&&r.async===!1)return a(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));if(typeof e>"u"||e===null)return a(new Error("marked(): input parameter is undefined or null"));if(typeof e!="string")return a(new Error("marked(): input parameter is of type "+Object.prototype.toString.call(e)+", string expected"));if(s.hooks&&(s.hooks.options=s,s.hooks.block=t),s.async)return(async()=>{let i=s.hooks?await s.hooks.preprocess(e):e,l=await(s.hooks?await s.hooks.provideLexer(t):t?y.lex:y.lexInline)(i,s),o=s.hooks?await s.hooks.processAllTokens(l):l;s.walkTokens&&await Promise.all(this.walkTokens(o,s.walkTokens));let u=await(s.hooks?await s.hooks.provideParser(t):t?S.parse:S.parseInline)(o,s);return s.hooks?await s.hooks.postprocess(u):u})().catch(a);try{s.hooks&&(e=s.hooks.preprocess(e));let i=(s.hooks?s.hooks.provideLexer(t):t?y.lex:y.lexInline)(e,s);s.hooks&&(i=s.hooks.processAllTokens(i)),s.walkTokens&&this.walkTokens(i,s.walkTokens);let l=(s.hooks?s.hooks.provideParser(t):t?S.parse:S.parseInline)(i,s);return s.hooks&&(l=s.hooks.postprocess(l)),l}catch(i){return a(i)}}}onError(t,e){return n=>{if(n.message+=`
Please report this to https://github.com/markedjs/marked.`,t){let r="<p>An error occurred:</p><pre>"+$(n.message+"",!0)+"</pre>";return e?Promise.resolve(r):r}if(e)return Promise.reject(n);throw n}}},B=new et;function b(t,e){return B.parse(t,e)}b.options=b.setOptions=function(t){return B.setOptions(t),b.defaults=B.defaults,Ve(b.defaults),b};b.getDefaults=he;b.defaults=L;b.use=function(...t){return B.use(...t),b.defaults=B.defaults,Ve(b.defaults),b};b.walkTokens=function(t,e){return B.walkTokens(t,e)};b.parseInline=B.parseInline;b.Parser=S;b.parser=S.parse;b.Renderer=Y;b.TextRenderer=we;b.Lexer=y;b.lexer=y.lex;b.Tokenizer=K;b.Hooks=N;b.parse=b;b.options;b.setOptions;b.use;b.walkTokens;b.parseInline;S.parse;y.lex;let tt=!1;const Sr=t=>{tt=t},v=t=>t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),pn=/\.(png|jpe?g|gif|webp|bmp|ico|avif|tiff?|svg)$/i;function gn(t){let e="",n=!0;for(const r of t)/[\p{L}\p{N}]/u.test(r)?(e+=r.toLowerCase(),n=!1):n||(e+="-",n=!0);return e.replace(/-+$/,"")}function nt(t,e,n){let r=t.trim(),s=null;if(n){const i=e.trim();i&&/^[0-9]+$/.test(i)&&(s=i)}if(r.startsWith("http:")||r.startsWith("https:")||r.startsWith("data:"))return`<img src="${v(r)}" alt="${v(e)}" loading="lazy">`;if(pn.test(r)){const i=s?` style="max-width:${s}px"`:"";return`<img data-embed="${v(r)}" alt="${v(e)}"${i}>`}const a=e===""||/^[0-9]+$/.test(e)?r.split("/").pop()??r:e;return`<a class="wikilink attachment" href="#" data-path="${v(r)}">${v(a)}</a>`}const bn={name:"wikiembed",level:"inline",start:t=>t.indexOf("!["),tokenizer(t){const e=/^!\[\[([^\][|]+?)(?:\|([^\][]*))?\]\]/.exec(t);if(e)return{type:"wikiembed",raw:e[0],target:e[1],label:e[2]??""}},renderer:t=>nt(t.target,t.label,!0)},mn={name:"wikilink",level:"inline",start:t=>t.indexOf("[["),tokenizer(t){const e=/^\[\[([^\][|]+?)(?:\|([^\][]*))?\]\]/.exec(t);if(!e)return;const n=e[1].trim();return{type:"wikilink",raw:e[0],target:n,label:(e[2]??e[1]).trim()||n}},renderer:t=>{const{target:e,label:n}=t;return`<a class="wikilink" href="#" data-wikilink="${v(e)}">${v(n)}</a>`}},rt=new et({gfm:!0});rt.use({extensions:[bn,mn],renderer:{image({href:t,text:e}){return nt(t,e,!1)},link(t){const e=t.href,n=this.parser.parseInline(t.tokens);if(e.startsWith("#")||e.includes(":")||e.startsWith("//")){const s=t.title?` title="${v(t.title)}"`:"";return`<a href="${v(e)}"${s}>${n}</a>`}return`<a class="wikilink" href="#" data-path="${v(e)}">${n}</a>`},heading(t){const e=this.parser.parseInline(t.tokens);return`<h${t.depth} id="${gn(t.text)}">${e}</h${t.depth}>
`}}});const kn=/^---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)(?:\r?\n|$)/;function xn(t){const e=t.replace(kn,"");return rt.parse(e,{breaks:tt,async:!1})}const wn=`# text — Ayu Mirage: the minimalist mid-dark ayu variant.
# See text-dark.toml for the token reference.

name = "Ayu Mirage"
dark = true

[colors]
bg = "#1f2430"
bg-panel = "#1c212b"
bg-hover = "#2a3041"
fg = "#cccac2"
fg-muted = "#707a8c"
accent = "#ffcc66"
heading = "#ffd580"
link = "#5ccfe6"
tag = "#d4bfff"
quote = "#bae67e"
code = "#f29e74"
code-bg = "#242936"
border = "#2a3041"
cursor = "#ffcc66"
selection = "#34455a"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,_n=`# text — Catppuccin Frappé: soft dark for bright rooms (catppuccin.com).
# See text-dark.toml for the token reference.

name = "Catppuccin Frappé"
dark = true

[colors]
bg = "#303446"
bg-panel = "#292c3c"
bg-hover = "#414559"
fg = "#c6d0f5"
fg-muted = "#838ba7"
accent = "#ca9ee6"
heading = "#babbf1"
link = "#8caaee"
tag = "#81c8be"
quote = "#a5adce"
code = "#ef9f76"
code-bg = "#363a4f"
border = "#414559"
cursor = "#f2d5cf"
selection = "#51576d"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,yn=`# text — Catppuccin Latte: the clean light flavor (catppuccin.com).
# See text-dark.toml for the token reference.

name = "Catppuccin Latte"
dark = false

[colors]
bg = "#eff1f5"
bg-panel = "#e6e9ef"
bg-hover = "#dce0e8"
fg = "#4c4f69"
fg-muted = "#8c8fa1"
accent = "#8839ef"
heading = "#7287fd"
link = "#1e66f5"
tag = "#179299"
quote = "#6c6f85"
code = "#fe640b"
code-bg = "#e6e9ef"
border = "#dce0e8"
cursor = "#dc8a78"
selection = "#ccd0da"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Sn=`# text — Catppuccin Macchiato: the standard soothing dark (catppuccin.com).
# See text-dark.toml for the token reference.

name = "Catppuccin Macchiato"
dark = true

[colors]
bg = "#24273a"
bg-panel = "#1e2030"
bg-hover = "#363a4f"
fg = "#cad3f5"
fg-muted = "#8087a2"
accent = "#c6a0f6"
heading = "#b7bdf8"
link = "#8aadf4"
tag = "#8bd5ca"
quote = "#a5adcb"
code = "#f5a97f"
code-bg = "#2b2f44"
border = "#363a4f"
cursor = "#f4dbd6"
selection = "#494d64"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,vn=`# text — Catppuccin Mocha: soothing dark pastels (catppuccin.com).
# See text-dark.toml for the token reference.

name = "Catppuccin Mocha"
dark = true

[colors]
bg = "#1e1e2e"
bg-panel = "#181825"
bg-hover = "#313244"
fg = "#cdd6f4"
fg-muted = "#7f849c"
accent = "#cba6f7"
heading = "#b4befe"
link = "#89b4fa"
tag = "#94e2d5"
quote = "#a6adc8"
code = "#fab387"
code-bg = "#27273a"
border = "#313244"
cursor = "#f5e0dc"
selection = "#45475a"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,$n=`# text — Classic Paper: warm cream and charcoal, like good stationery.
# See text-dark.toml for the token reference.

name = "Classic Paper"
dark = false

[colors]
bg = "#faf6ec"
bg-panel = "#f2edde"
bg-hover = "#e9e2cf"
fg = "#3a3733"
fg-muted = "#8e887b"
accent = "#7a6a52"
heading = "#262421"
link = "#5a6e58"
tag = "#7a6488"
quote = "#6e6657"
code = "#8a5a3b"
code-bg = "#f1ebdb"
border = "#e3dcc8"
cursor = "#3a3733"
selection = "#e4dbc1"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Cn=`# text — Cobalt 2: rich blue with orange accents (Wes Bos's classic).
# See text-dark.toml for the token reference.

name = "Cobalt 2"
dark = true

[colors]
bg = "#193549"
bg-panel = "#15232d"
bg-hover = "#1f4662"
fg = "#e1efff"
fg-muted = "#7d9cb8"
accent = "#ffc600"
heading = "#ffc600"
link = "#9effff"
tag = "#fb94ff"
quote = "#9bb2c5"
code = "#a5ff90"
code-bg = "#122738"
border = "#234e6d"
cursor = "#ffc600"
selection = "#0050a4"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Rn=`# text — Cyberpunk Green: matrix-style terminal green on near-black.
# See text-dark.toml for the token reference.

name = "Cyberpunk Green"
dark = true

[colors]
bg = "#0a0f0a"
bg-panel = "#0d140d"
bg-hover = "#142214"
fg = "#33ff66"
fg-muted = "#1f9940"
accent = "#00ffaa"
heading = "#7dffa0"
link = "#00e5ff"
tag = "#a3ff57"
quote = "#2bd45e"
code = "#c7ff7a"
code-bg = "#0f1a0f"
border = "#1b2e1b"
cursor = "#33ff66"
selection = "#1a4426"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Tn=`# text — Dark Academia: moody library, old ink and lamplight.
# See text-dark.toml for the token reference.

name = "Dark Academia"
dark = true

[colors]
bg = "#23201b"
bg-panel = "#1d1a16"
bg-hover = "#322d25"
fg = "#d6c8ad"
fg-muted = "#857a64"
accent = "#c2974f"
heading = "#e8d9b8"
link = "#a98f5c"
tag = "#9d8466"
quote = "#a89a7d"
code = "#b87f4d"
code-bg = "#2a261f"
border = "#373127"
cursor = "#d6c8ad"
selection = "#453d2e"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Mn=`# text — Dawn: soft early-morning light, rosy and quiet.
# See text-dark.toml for the token reference.

name = "Dawn"
dark = false

[colors]
bg = "#faf4ed"
bg-panel = "#fffaf3"
bg-hover = "#f2e9e1"
fg = "#575279"
fg-muted = "#9893a5"
accent = "#d7827e"
heading = "#286983"
link = "#907aa9"
tag = "#56949f"
quote = "#797593"
code = "#ea9d34"
code-bg = "#f4ede8"
border = "#ece4db"
cursor = "#575279"
selection = "#efe2d4"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,zn=`# text — Dracula: the high-contrast purple/pink dark classic (draculatheme.com).
# See text-dark.toml for the token reference.

name = "Dracula"
dark = true

[colors]
bg = "#282a36"
bg-panel = "#21222c"
bg-hover = "#343746"
fg = "#f8f8f2"
fg-muted = "#6272a4"
accent = "#bd93f9"
heading = "#ff79c6"
link = "#8be9fd"
tag = "#50fa7b"
quote = "#bcc4e0"
code = "#f1fa8c"
code-bg = "#2f3140"
border = "#343746"
cursor = "#f8f8f2"
selection = "#44475a"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,An=`# text — Emotion Side B Dark: crisp charcoal page, the album's bright blue and
# hot pink on the chrome. Blue on tabs/buttons/links/caret; pink on the active
# file and selection (see the sibling .css). See text-dark.toml for tokens.

name = "Emotion Side B Dark"
dark = true

[colors]
bg = "#0f1115"
bg-panel = "#15181e"
bg-hover = "#1d212a"
fg = "#eef0f4"
fg-muted = "#888e9a"
accent = "#3d9bff"
heading = "#f2f4f8"
link = "#3d9bff"
tag = "#ff5fa0"
quote = "#888e9a"
code = "#ff8fb8"
code-bg = "#1b1620"
border = "#242833"
cursor = "#3d9bff"
selection = "#3a2030"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Bn=`# text — Emotion Side B: crisp white page, the album's bright blue and hot
# pink saved for the chrome. Blue rides the tabs/buttons/links/caret; pink
# marks the active file and your selection (see the sibling .css for placement).
# See text-dark.toml for the token reference.

name = "Emotion Side B"
dark = false

[colors]
bg = "#ffffff"
bg-panel = "#f7f8fc"
bg-hover = "#eef1f8"
fg = "#16181d"
fg-muted = "#8a8f9b"
accent = "#2b8fff"
heading = "#14161b"
link = "#2b8fff"
tag = "#ff4f9a"
quote = "#8a8f9b"
code = "#c2266e"
code-bg = "#fdeef5"
border = "#e6e8f0"
cursor = "#2b8fff"
selection = "#ffd6e6"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Ln=`# text — Everforest Light: soft, low-contrast forest greens on warm paper.
# See text-dark.toml for the token reference.

name = "Everforest Light"
dark = false

[colors]
bg = "#fdf6e3"
bg-panel = "#f4f0d9"
bg-hover = "#efebd4"
fg = "#5c6a72"
fg-muted = "#939f91"
accent = "#8da101"
heading = "#3a4750"
link = "#3a94c5"
tag = "#df69ba"
quote = "#829181"
code = "#dfa000"
code-bg = "#f4f0d9"
border = "#e6e2cc"
cursor = "#5c6a72"
selection = "#dde6cf"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Dn=`# text — Everforest: soft green-on-warm-grey, designed for long comfortable
# sessions. See text-dark.toml for the token reference.

name = "Everforest"
dark = true

[colors]
bg = "#2d353b"
bg-panel = "#343f44"
bg-hover = "#3d484d"
fg = "#d3c6aa"
fg-muted = "#859289"
accent = "#a7c080"
heading = "#dbbc7f"
link = "#7fbbb3"
tag = "#d699b6"
quote = "#859289"
code = "#83c092"
code-bg = "#343f44"
border = "#3d484d"
cursor = "#d3c6aa"
selection = "#475258"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,qn=`# text — Fjord: cool blue-grey dark theme on the Nord palette.
# See text-dark.toml for the token reference.

name = "Fjord"
dark = true

[colors]
bg = "#2e3440"
bg-panel = "#292e39"
bg-hover = "#353b49"
fg = "#d8dee9"
fg-muted = "#7b88a1"
accent = "#88c0d0"
heading = "#8fbcbb"
link = "#81a1c1"
tag = "#b48ead"
quote = "#90a0b8"
code = "#ebcb8b"
code-bg = "#353b49"
border = "#3b4252"
cursor = "#d8dee9"
selection = "#434c5e"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,En=`# text — GitHub Light: stark white and gray, straight off the platform.
# See text-dark.toml for the token reference.

name = "GitHub Light"
dark = false

[colors]
bg = "#ffffff"
bg-panel = "#f6f8fa"
bg-hover = "#eaeef2"
fg = "#1f2328"
fg-muted = "#656d76"
accent = "#0969da"
heading = "#1f2328"
link = "#0969da"
tag = "#8250df"
quote = "#656d76"
code = "#cf222e"
code-bg = "#f6f8fa"
border = "#d8dee4"
cursor = "#1f2328"
selection = "#b6d7ff"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Pn=`# text — Gruvbox Light: the warm, retro counterpart to Gruvbox.
# See text-dark.toml for the token reference.

name = "Gruvbox Light"
dark = false

[colors]
bg = "#fbf1c7"
bg-panel = "#f4e8be"
bg-hover = "#ebdbb2"
fg = "#3c3836"
fg-muted = "#7c6f64"
accent = "#af3a03"
heading = "#9d0006"
link = "#076678"
tag = "#8f3f71"
quote = "#427b58"
code = "#b57614"
code-bg = "#f2e5bc"
border = "#d5c4a1"
cursor = "#3c3836"
selection = "#e6d5a3"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,jn=`# text — Gruvbox: warm retro-groove dark (github.com/morhetz/gruvbox).
# See text-dark.toml for the token reference.

name = "Gruvbox"
dark = true

[colors]
bg = "#282828"
bg-panel = "#1d2021"
bg-hover = "#3c3836"
fg = "#ebdbb2"
fg-muted = "#928374"
accent = "#fe8019"
heading = "#fabd2f"
link = "#83a598"
tag = "#d3869b"
quote = "#b8bb26"
code = "#8ec07c"
code-bg = "#32302f"
border = "#3c3836"
cursor = "#ebdbb2"
selection = "#504945"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Fn=`# text — iA Writer Dark: the signature minimalist look, inverted. Near-black
# paper, warm grey ink, one calm blue accent. See text-dark.toml for tokens.

name = "iA Writer Dark"
dark = true

[colors]
bg = "#1a1a1a"
bg-panel = "#202020"
bg-hover = "#2a2a2a"
fg = "#cfcfcf"
fg-muted = "#6f6f6f"
accent = "#5c9cdb"
heading = "#f2f2f2"
link = "#5c9cdb"
tag = "#8a8a8a"
quote = "#8f8f8f"
code = "#bdbdbd"
code-bg = "#222222"
border = "#2c2c2c"
cursor = "#5c9cdb"
selection = "#27384a"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,In=`# text — iA Writer: clean minimalist white with the signature blue accent.
# See text-dark.toml for the token reference.

name = "iA Writer"
dark = false

[colors]
bg = "#fcfcfc"
bg-panel = "#f3f3f3"
bg-hover = "#e9e9e9"
fg = "#1a1a1a"
fg-muted = "#9b9b9b"
accent = "#1d9bf0"
heading = "#000000"
link = "#1d9bf0"
tag = "#7a7a7a"
quote = "#6f6f6f"
code = "#4a4a4a"
code-bg = "#f3f3f3"
border = "#e4e4e4"
cursor = "#1d9bf0"
selection = "#cce7fb"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Nn=`# text — Midnight: true deep black/onyx, for OLED and late nights.
# See text-dark.toml for the token reference.

name = "Midnight"
dark = true

[colors]
bg = "#000000"
bg-panel = "#0a0a0c"
bg-hover = "#16161a"
fg = "#c8c8cc"
fg-muted = "#5e5e66"
accent = "#5e8cc4"
heading = "#e4e4e8"
link = "#5e8cc4"
tag = "#8d84b8"
quote = "#84888c"
code = "#b0a184"
code-bg = "#0e0e10"
border = "#1a1a1e"
cursor = "#c8c8cc"
selection = "#22344a"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,On=`# text — Monokai Calm: monokai's voice, desaturated to easy-evening levels.
# See text-dark.toml for the token reference.

name = "Monokai Calm"
dark = true

[colors]
bg = "#2a2a26"
bg-panel = "#232320"
bg-hover = "#32322d"
fg = "#d8d8d2"
fg-muted = "#8f8f85"
accent = "#a6c969"
heading = "#dfd06e"
link = "#87c5c0"
tag = "#c489b2"
quote = "#9c9c90"
code = "#d3a96c"
code-bg = "#32322d"
border = "#3a3a34"
cursor = "#d8d8d2"
selection = "#45453d"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Jn=`# text — Night Owl: deep blue dark theme after Sarah Drasner's palette.
# See text-dark.toml for the token reference.

name = "Night Owl"
dark = true

[colors]
bg = "#011627"
bg-panel = "#01111d"
bg-hover = "#0b2942"
fg = "#d6deeb"
fg-muted = "#637777"
accent = "#82aaff"
heading = "#c792ea"
link = "#82aaff"
tag = "#7fdbca"
quote = "#697098"
code = "#ecc48d"
code-bg = "#0b2942"
border = "#122d42"
cursor = "#80a4c2"
selection = "#1d3b53"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Vn=`# text — Nord Light: the Snow Storm palette, frost accents on cool white.
# See text-dark.toml for the token reference.

name = "Nord Light"
dark = false

[colors]
bg = "#eceff4"
bg-panel = "#e5e9f0"
bg-hover = "#dde3ec"
fg = "#2e3440"
fg-muted = "#60718c"
accent = "#5e81ac"
heading = "#2e3440"
link = "#5e81ac"
tag = "#b48ead"
quote = "#4c566a"
code = "#bf616a"
code-bg = "#e5e9f0"
border = "#d8dee9"
cursor = "#2e3440"
selection = "#d2dae6"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Zn=`# text — Nord: the arctic, muted blue palette (nordtheme.com).
# See text-dark.toml for the token reference.

name = "Nord"
dark = true

[colors]
bg = "#2e3440"
bg-panel = "#3b4252"
bg-hover = "#434c5e"
fg = "#d8dee9"
fg-muted = "#7b88a1"
accent = "#88c0d0"
heading = "#eceff4"
link = "#81a1c1"
tag = "#b48ead"
quote = "#a3be8c"
code = "#ebcb8b"
code-bg = "#3b4252"
border = "#3b4252"
cursor = "#d8dee9"
selection = "#434c5e"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Wn=`# text — Oceanic Next: deep sea blues and teals.
# See text-dark.toml for the token reference.

name = "Oceanic Next"
dark = true

[colors]
bg = "#1b2b34"
bg-panel = "#16232a"
bg-hover = "#29414f"
fg = "#cdd3de"
fg-muted = "#65737e"
accent = "#6699cc"
heading = "#c0c5ce"
link = "#5fb3b3"
tag = "#c594c5"
quote = "#99c794"
code = "#fac863"
code-bg = "#20323c"
border = "#29414f"
cursor = "#cdd3de"
selection = "#34495a"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Gn=`# text — One Light: the clean, neutral Atom One Light palette.
# See text-dark.toml for the token reference.

name = "One Light"
dark = false

[colors]
bg = "#fafafa"
bg-panel = "#f0f0f1"
bg-hover = "#e7e7e8"
fg = "#383a42"
fg-muted = "#a0a1a7"
accent = "#4078f2"
heading = "#383a42"
link = "#4078f2"
tag = "#a626a4"
quote = "#a0a1a7"
code = "#986801"
code-bg = "#f0f0f1"
border = "#e5e5e6"
cursor = "#526fff"
selection = "#dfe2e7"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Hn=`# text — Rosewater: soft warm light theme on the Rosé Pine Dawn palette.
# See text-dark.toml for the token reference.

name = "Rosewater"
dark = false

[colors]
bg = "#faf4ed"
bg-panel = "#f3ebe3"
bg-hover = "#ede4da"
fg = "#575279"
fg-muted = "#9893a5"
accent = "#d7827e"
heading = "#b4637a"
link = "#907aa9"
tag = "#56949f"
quote = "#797593"
code = "#b8863b"
code-bg = "#f1e8de"
border = "#ede0d4"
cursor = "#575279"
selection = "#efdfd0"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Qn=`# text — Sepia: warm manuscript paper, in the spirit of focused writing apps.
# See text-dark.toml for the token reference.

name = "Sepia"
dark = false

[colors]
bg = "#f4ecd8"
bg-panel = "#ece1c8"
bg-hover = "#e5d8bc"
fg = "#5b4636"
fg-muted = "#a08e76"
accent = "#a0653a"
heading = "#4a3526"
link = "#8b5e34"
tag = "#7a6a8a"
quote = "#8a7660"
code = "#7d5a2b"
code-bg = "#ebdfc5"
border = "#e0d2b4"
cursor = "#5b4636"
selection = "#e7d7b5"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Xn=`# text — Solarized Dark: Ethan Schoonover's precision palette (ethanschoonover.com/solarized).
# See text-dark.toml for the token reference.

name = "Solarized Dark"
dark = true

[colors]
bg = "#002b36"
bg-panel = "#073642"
bg-hover = "#0a4250"
fg = "#93a1a1"
fg-muted = "#586e75"
accent = "#b58900"
heading = "#fdf6e3"
link = "#268bd2"
tag = "#6c71c4"
quote = "#859900"
code = "#2aa198"
code-bg = "#073642"
border = "#073642"
cursor = "#93a1a1"
selection = "#0e4a59"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Un=`# text — Solarized Light: Ethan Schoonover's classic low-contrast prose palette.
# See text-dark.toml for the token reference.

name = "Solarized Light"
dark = false

[colors]
bg = "#fdf6e3"
bg-panel = "#eee8d5"
bg-hover = "#e8e1cd"
fg = "#657b83"
fg-muted = "#93a1a1"
accent = "#268bd2"
heading = "#586e75"
link = "#268bd2"
tag = "#6c71c4"
quote = "#859900"
code = "#cb4b16"
code-bg = "#f3ecd9"
border = "#e8e0c9"
cursor = "#657b83"
selection = "#e3dcc4"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Kn=`# text — Terminal Amber: classic 80s monitor phosphor glow.
# See text-dark.toml for the token reference.

name = "Terminal Amber"
dark = true

[colors]
bg = "#1a1004"
bg-panel = "#201405"
bg-hover = "#2e1d08"
fg = "#ffb000"
fg-muted = "#9a6a08"
accent = "#ffd75f"
heading = "#ffd75f"
link = "#ffc83d"
tag = "#e89c2c"
quote = "#cf8f10"
code = "#ffcf70"
code-bg = "#241607"
border = "#3a250a"
cursor = "#ffb000"
selection = "#4a3008"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Yn=`# text — theme file
#
# Drop a copy of this file in this folder, change the colors, and it appears
# in the theme picker (Ctrl+Shift+T). An optional sibling <name>.css file is
# injected verbatim for anything tokens can't reach.
#
# tokens:
#   bg         editor background          fg         body text
#   bg-panel   sidebar / panel background fg-muted   secondary text, syntax marks
#   bg-hover   hover / active row         accent     interactive highlights, cursor line
#   heading    markdown headings          link       links and wikilinks
#   tag        #tags                      quote      blockquotes
#   code       inline code / monospans    code-bg    code block background
#   border     hairlines                  cursor     caret
#   selection  text selection

name = "Text Dark"
dark = true

[colors]
bg = "#151618"
bg-panel = "#1b1d20"
bg-hover = "#222428"
fg = "#d4d4d0"
fg-muted = "#84878c"
accent = "#8fb4d8"
heading = "#e8e6e0"
link = "#8fb4d8"
tag = "#a8a3c7"
quote = "#9aa3a8"
code = "#c9b99a"
code-bg = "#1f2125"
border = "#26282c"
cursor = "#d4d4d0"
selection = "#2c3a48"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,er=`# text — Text Light: paper-white counterpart to Text Dark.
# See text-dark.toml for the token reference.

name = "Text Light"
dark = false

[colors]
bg = "#faf9f6"
bg-panel = "#f1efe9"
bg-hover = "#e9e6dd"
fg = "#2c2c2a"
fg-muted = "#8b8880"
accent = "#4a6e8a"
heading = "#1c1c1a"
link = "#41637c"
tag = "#6d5f8f"
quote = "#6b6f72"
code = "#6d5f3f"
code-bg = "#efede5"
border = "#e2dfd6"
cursor = "#2c2c2a"
selection = "#d9e2ea"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,tr=`# text — Tokyo Day: the bright daytime variant of Tokyo Night.
# See text-dark.toml for the token reference.

name = "Tokyo Day"
dark = false

[colors]
bg = "#e1e2e7"
bg-panel = "#d6d8df"
bg-hover = "#cbcfdb"
fg = "#3760bf"
fg-muted = "#7086b5"
accent = "#2e7de9"
heading = "#006a83"
link = "#2e7de9"
tag = "#9854f1"
quote = "#587539"
code = "#b15c00"
code-bg = "#d6d8df"
border = "#c4c8da"
cursor = "#3760bf"
selection = "#b6bfe2"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,nr=`# text — Tokyo Night: neon dusk-to-night blues and purples.
# See text-dark.toml for the token reference.

name = "Tokyo Night"
dark = true

[colors]
bg = "#1a1b26"
bg-panel = "#16161e"
bg-hover = "#292e42"
fg = "#a9b1d6"
fg-muted = "#565f89"
accent = "#7aa2f7"
heading = "#c0caf5"
link = "#7dcfff"
tag = "#bb9af7"
quote = "#9ece6a"
code = "#e0af68"
code-bg = "#1f2335"
border = "#292e42"
cursor = "#c0caf5"
selection = "#33467c"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,rr=`# text — Zenburn: the original low-contrast "coding in a cave" palette,
# warm greys and faded pastels. See text-dark.toml for the token reference.

name = "Zenburn"
dark = true

[colors]
bg = "#3f3f3f"
bg-panel = "#383838"
bg-hover = "#4f4f4f"
fg = "#dcdccc"
fg-muted = "#9f9f93"
accent = "#8cd0d3"
heading = "#f0dfaf"
link = "#8cd0d3"
tag = "#dc8cc3"
quote = "#7f9f7f"
code = "#dfaf8f"
code-bg = "#383838"
border = "#4a4a4a"
cursor = "#dcdccc"
selection = "#5a5a52"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,sr=`/* Emotion Side B Dark — hot pink on the active file row against blue chrome. */
.tree-row.current {
  background: color-mix(in srgb, #ff5fa0 18%, transparent);
  color: #ff7fb4;
  box-shadow: inset 3px 0 0 #ff5fa0;
}
.tree-row.current .tree-icon {
  opacity: 0.9;
}
`,ar=`/* Emotion Side B — put the hot pink on the active file row so it reads
   against the blue tabs/buttons. Tokens carry the blue; this carries the pink. */
.tree-row.current {
  background: color-mix(in srgb, #ff4f9a 14%, transparent);
  color: #e23e86;
  box-shadow: inset 3px 0 0 #ff4f9a;
}
.tree-row.current .tree-icon {
  opacity: 0.9;
}
`,or=Object.assign({"../../src-tauri/themes/ayu-mirage.toml":wn,"../../src-tauri/themes/catppuccin-frappe.toml":_n,"../../src-tauri/themes/catppuccin-latte.toml":yn,"../../src-tauri/themes/catppuccin-macchiato.toml":Sn,"../../src-tauri/themes/catppuccin-mocha.toml":vn,"../../src-tauri/themes/classic-paper.toml":$n,"../../src-tauri/themes/cobalt2.toml":Cn,"../../src-tauri/themes/cyberpunk-green.toml":Rn,"../../src-tauri/themes/dark-academia.toml":Tn,"../../src-tauri/themes/dawn.toml":Mn,"../../src-tauri/themes/dracula.toml":zn,"../../src-tauri/themes/emotion-side-b-dark.toml":An,"../../src-tauri/themes/emotion-side-b.toml":Bn,"../../src-tauri/themes/everforest-light.toml":Ln,"../../src-tauri/themes/everforest.toml":Dn,"../../src-tauri/themes/fjord.toml":qn,"../../src-tauri/themes/github-light.toml":En,"../../src-tauri/themes/gruvbox-light.toml":Pn,"../../src-tauri/themes/gruvbox.toml":jn,"../../src-tauri/themes/ia-writer-dark.toml":Fn,"../../src-tauri/themes/ia-writer.toml":In,"../../src-tauri/themes/midnight.toml":Nn,"../../src-tauri/themes/monokai-calm.toml":On,"../../src-tauri/themes/night-owl.toml":Jn,"../../src-tauri/themes/nord-light.toml":Vn,"../../src-tauri/themes/nord.toml":Zn,"../../src-tauri/themes/oceanic-next.toml":Wn,"../../src-tauri/themes/one-light.toml":Gn,"../../src-tauri/themes/rosewater.toml":Hn,"../../src-tauri/themes/sepia.toml":Qn,"../../src-tauri/themes/solarized-dark.toml":Xn,"../../src-tauri/themes/solarized-light.toml":Un,"../../src-tauri/themes/terminal-amber.toml":Kn,"../../src-tauri/themes/text-dark.toml":Yn,"../../src-tauri/themes/text-light.toml":er,"../../src-tauri/themes/tokyo-day.toml":tr,"../../src-tauri/themes/tokyo-night.toml":nr,"../../src-tauri/themes/zenburn.toml":rr}),ir=Object.assign({"../../src-tauri/themes/emotion-side-b-dark.css":sr,"../../src-tauri/themes/emotion-side-b.css":ar}),Le=t=>(t.split("/").pop()??t).replace(/\.[^.]*$/,"");function lr(t){let e="",n=!1;const r={colors:{},fonts:{}};let s=null;for(const a of t.split(`
`)){const i=a.trim();if(!i||i.startsWith("#"))continue;const l=/^\[([A-Za-z0-9_-]+)\]$/.exec(i);if(l){s=r[l[1]]??(r[l[1]]={});continue}const o=/^([A-Za-z0-9_-]+)\s*=\s*(.+)$/.exec(i);if(!o)continue;const u=o[1];let c=o[2].trim(),f;const d=/^"((?:[^"\\]|\\.)*)"|^'([^']*)'/.exec(c);d?f=d[1]!==void 0?d[1].replace(/\\(.)/g,"$1"):d[2]:f=c.split("#")[0].trim(),s?s[u]=f:u==="name"?e=f:u==="dark"&&(n=f==="true")}return{name:e,dark:n,colors:r.colors,fonts:r.fonts}}let ae=null;function cr(){if(ae)return ae;const t=new Map(Object.entries(ir).map(([n,r])=>[Le(n),r])),e=[];for(const[n,r]of Object.entries(or)){const s=Le(n);try{const a=lr(r);e.push({id:s,name:a.name||s,dark:a.dark,colors:a.colors,fonts:a.fonts,css:t.get(s)??null})}catch(a){console.error(`theme ${s}:`,a)}}return e.sort((n,r)=>n.name.localeCompare(r.name)),ae=e,e}const ur=4*1024*1024,fr=2*1024*1024,De=500,hr=new Set(["md","markdown","mdown","txt","text","json","yaml","yml","toml","ini","cfg","conf","csv","tsv","log","tex","bib","org","rst","adoc","html","htm","css","js","ts","jsx","tsx","py","rs","sh","bash","zsh","fish","c","h","cpp","hpp","go","rb","lua","sql","xml","svg","env","gitignore","fountain"]),dr=new Set(["png","jpg","jpeg","gif","webp","bmp","ico","avif","tiff","tif","mp3","wav","ogg","oga","m4a","flac","opus","aac","weba","mp4","m4v","webm","mov","mkv","ogv","pdf"]),st=t=>{const e=t.lastIndexOf(".");return e>0?t.slice(e+1).toLowerCase():null},_e=t=>{const e=st(t);return e===null||hr.has(e)},pr=t=>_e(t)||dr.has(st(t)??""),k=t=>{const e=t.trim().replace(/\/+$/,"");return e===""||e==="/"?"":e.startsWith("/")?e:`/${e}`},qe=(t,e)=>`${k(t)}/${e}`,Ee=t=>t.slice(t.lastIndexOf("/")+1),gr=t=>t.slice(0,t.lastIndexOf("/")),ye=(t,e)=>e.slice(k(t).length).replace(/^\//,""),at=t=>t.split("/").some(e=>e.startsWith(".")),ne=new Map,T=new Map;function C(t,e){const n=R(t);if(ne.set(t.path_lower,{rev:t.rev,mtime:n}),e!==void 0&&_e(t.name)){const r={rev:t.rev,text:e,mtime:n,path:t.path_display,size:t.size};T.set(t.path_lower,r),gt({pathLower:t.path_lower,...r})}}function Pe(t){const e=`${t}/`;for(const n of[ne,T])for(const r of n.keys())(r===t||r.startsWith(e))&&n.delete(r);Oe(t)}const ue=t=>t!==null&&t[".tag"]!=="folder",je=(t,e)=>e[".tag"]==="file"&&_e(e.name)&&e.size<=ur&&!at(ye(t,e.path_display));let br=null;const mr=()=>br??(br=pt().then(t=>{for(const e of t)T.has(e.pathLower)||T.set(e.pathLower,{rev:e.rev,text:e.text,mtime:e.mtime,path:e.path,size:e.size})}));async function Fe(t){const e=t.filter(s=>{var a;return((a=T.get(s.path_lower))==null?void 0:a.rev)!==s.rev});let n=0;const r=async()=>{for(;n<e.length;){const s=e[n++],{resp:a,meta:i}=await X(s.path_lower);C(i,await a.text())}};await Promise.all(Array.from({length:Math.min(6,e.length)},r))}async function oe(t){const e=k(t);await mr();const n=await mt(e.toLowerCase());let r=!1;if(n)try{const i=await ft(n);for(const l of i.entries)l[".tag"]==="deleted"&&(T.delete(l.path_lower),ne.delete(l.path_lower),Oe(l.path_lower));await Fe(i.entries.filter(l=>je(e,l))),await $e(e.toLowerCase(),i.cursor),r=!0}catch{await kt(e.toLowerCase())}if(!r){const{entries:i,cursor:l}=await ht(e,!0),o=i.filter(f=>je(e,f)),u=new Set(o.map(f=>f.path_lower)),c=`${e.toLowerCase()}/`;for(const f of T.keys())f.startsWith(c)&&!u.has(f)&&(T.delete(f),bt(f));await Fe(o),await $e(e.toLowerCase(),l)}const s=`${e.toLowerCase()}/`,a=[];for(const[i,l]of T)i.startsWith(s)&&a.push(l);return a}async function kr(t,e,n){const r=k(t);let s;const a=ne.get(r.toLowerCase());if(n===null)s="overwrite";else if(a&&a.mtime===n)s={".tag":"update",update:a.rev};else{const i=await Se(r);if(!ue(i))s="add";else{if(R(i)!==n)return{mtime:R(i),conflict:!0};s={".tag":"update",update:i.rev}}}try{const i=await I(r,e,s);return C(i,e),{mtime:R(i),conflict:!1}}catch(i){if(i instanceof H&&Q(i.error,"conflict")){const l=await Se(r);return{mtime:ue(l)?R(l):0,conflict:!0}}throw i}}async function xr(t){const e=k(t),n=await ut(e,!0),r=new Map,s={name:"",path:e,is_dir:!0,mtime:0,children:[]};r.set(e.toLowerCase(),s);const a=n.filter(l=>l.path_lower!==e.toLowerCase()&&!at(ye(e,l.path_display)));for(const l of a)l[".tag"]==="folder"&&r.set(l.path_lower,{name:l.name,path:l.path_display,is_dir:!0,mtime:0,children:[]});for(const l of a){const o=r.get(gr(l.path_lower)||e.toLowerCase());o&&(l[".tag"]==="folder"?o.children.push(r.get(l.path_lower)):pr(l.name)&&(C(l),o.children.push({name:l.name,path:l.path_display,is_dir:!1,mtime:R(l),children:null})))}const i=l=>{const o=c=>c.name.toLowerCase(),u=[...l.filter(c=>c.is_dir).sort((c,f)=>o(c).localeCompare(o(f))),...l.filter(c=>!c.is_dir).sort((c,f)=>o(c).localeCompare(o(f)))];for(const c of u)c.children&&(c.children=i(c.children));return u};return i(s.children)}const Ie=t=>{const e=new Uint8Array(t);let n="";const r=32768;for(let s=0;s<e.length;s+=r)n+=String.fromCharCode(...e.subarray(s,s+r));return btoa(n)},Ne=t=>{const e=atob(t),n=new Uint8Array(e.length);for(let r=0;r<e.length;r++)n[r]=e.charCodeAt(r);return n},wr=(t,e,n)=>n?t.toLowerCase().indexOf(e):t.indexOf(e),vr={listTree:xr,writeFile:kr,readFile:async t=>{const{resp:e,meta:n}=await X(k(t)),r=await e.text();return C(n,r),{content:r,mtime:R(n)}},readImage:async t=>{const{resp:e,meta:n}=await X(k(t));return C(n),{base64:Ie(await e.arrayBuffer()),mtime:R(n)}},statMtime:async t=>{const e=await ct(k(t));if(!ue(e))throw new Error(`${t} is a folder`);return R(e)},createFile:async t=>{try{C(await I(k(t),"","add"),"")}catch(e){throw e instanceof H&&Q(e.error,"conflict")?new Error(`${t} already exists`):e}},createDir:async t=>{try{await D("files/create_folder_v2",{path:k(t),autorename:!1})}catch(e){if(e instanceof H&&Q(e.error,"conflict"))return;throw e}},renamePath:async(t,e)=>{await D("files/move_v2",{from_path:k(t),to_path:k(e),autorename:!1}),Pe(k(t).toLowerCase())},copyPath:async(t,e)=>(await D("files/copy_v2",{from_path:k(t),to_path:qe(e,Ee(k(t))),autorename:!0})).metadata.path_display,overwriteBase64:async(t,e)=>{C(await I(k(t),Ne(e),"overwrite"))},importFile:()=>{throw new Error("importFile is desktop-only")},writeBase64:async(t,e,n)=>{const r=await I(qe(t,e),Ne(n),"add",!0);return C(r),r.path_display},trashPath:async t=>{await D("files/delete_v2",{path:k(t)}),Pe(k(t).toLowerCase())},readBase64:async t=>{const{resp:e,meta:n}=await X(k(t));return C(n),Ie(await e.arrayBuffer())},writeTextFile:async(t,e)=>{C(await I(k(t),e,"overwrite"),e)},copyFile:async(t,e)=>{try{await D("files/delete_v2",{path:k(e)})}catch(n){if(!(n instanceof H&&Q(n.error,"not_found")))throw n}await D("files/copy_v2",{from_path:k(t),to_path:k(e),autorename:!1})},searchText:async(t,e)=>{if(!e.trim())return[];const n=!new RegExp("\\p{Lu}","u").test(e),r=n?e.toLowerCase():e,s=[];for(const a of await oe(t)){const i=a.text.split(`
`);for(let l=0;l<i.length;l++){const o=wr(i[l],r,n);if(!(o<0)&&(s.push({path:a.path,line:l+1,text:i[l].slice(0,400),start:o,end:Math.min(o+e.length,400)}),s.length>=De))return s}}return s},findBacklinks:async(t,e)=>{if(!e.trim())return[];const n=e.trim().replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),r=new RegExp(`\\[\\[${n}\\s*([|#][^\\]]*)?\\]\\]`,"i"),s=[];for(const a of await oe(t)){const i=a.text.split(`
`);for(let l=0;l<i.length;l++){const o=r.exec(i[l]);if(o&&(s.push({path:a.path,line:l+1,text:i[l].slice(0,400),start:o.index,end:Math.min(o.index+o[0].length,400)}),s.length>=De))return s}}return s},collectNotes:async t=>{const e=[];for(const n of await oe(t)){const r=Ee(n.path);if(!Ct(r)||n.size>fr)continue;const{fields:s,tags:a,tasks:i}=$t(n.text);e.push({path:n.path,rel:ye(t,n.path),name:r.replace(/\.[^.]*$/,""),mtime:n.mtime,tags:a,fields:s,tasks:i})}return e},openWindow:async(t,e)=>{const n=new URL(location.origin+location.pathname);t&&n.searchParams.set("root",t),e&&n.searchParams.set("file",e),window.open(n.toString(),"_blank")},windowInitParams:async()=>{const t=new URLSearchParams(location.search),e=t.get("root"),n=t.get("file");return e||n?{root:e,file:n}:null},renderPreview:async t=>xn(t),listThemes:async()=>cr(),themesDirPath:async()=>"",loadConfig:async()=>_t(),saveConfig:async t=>yt(t),watchRoot:async()=>{}};export{Rr as auth,vr as dropboxBackend,Sr as setSingleLineBreaks};

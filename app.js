// ================================================================
// Nexus IA v2 — GitHub Pages static app
// Auth real (usuários + admin) · Melhores modelos Groq · localStorage
// Padrão OrientaMe · Playfair + DM Sans · Paleta dourada
// ================================================================
const { useState, useEffect, useRef, useCallback, useMemo } = React;
const e = React.createElement;

// ── Modelos Groq (atualizado abril 2026) ──────────────────────
const MODELS = [
  { id: 'llama-3.1-8b-instant',         label: 'Llama 3.1 8B — Rápido e eficiente (padrão)', best: 'rápido',    ctx: 128000 },
  { id: 'llama-3.3-70b-versatile',      label: 'Llama 3.3 70B — Versátil geral',        best: 'geral',     ctx: 128000 },
  { id: 'openai/gpt-oss-120b',          label: 'GPT-OSS 120B — Inteligência máxima',    best: 'complexo',  ctx: 131072 },
  { id: 'moonshotai/kimi-k2-0905',      label: 'Kimi K2 — Contexto gigante (262k)',     best: 'longo',     ctx: 262144 },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout — Multimodal rápido',     best: 'visão',   ctx: 131072 },
  { id: 'qwen/qwen3-32b',               label: 'Qwen 3 32B — Raciocínio estruturado',   best: 'análise',   ctx: 131072 },
  { id: 'openai/gpt-oss-20b',           label: 'GPT-OSS 20B — Balanceado veloz',        best: 'balanceado',ctx: 131072 },
];
const DEFAULT_MODEL = 'llama-3.1-8b-instant';

// ── Storage keys ──────────────────────────────────────────────
const K_USERS    = 'nexus-users-v1';
const K_SESSION  = 'nexus-session-v1';
const K_CFG      = 'nexus-cfg-v1';
const K_CONVS    = 'nexus-convs-v1';
const K_DOCS     = 'nexus-docs-v1';

// ── Paleta (OrientaMe) ────────────────────────────────────────
const C = {
  bg:'#0a0a10', surface:'#13131c', card:'#1a1a25', elevated:'#1f1f2b', border:'#252535',
  accent:'#c9a84c', accentDim:'rgba(201,168,76,0.12)', accentL:'#e8c96d', accentGlow:'rgba(201,168,76,0.25)',
  text:'#ede9e2', muted:'#8a8799', faint:'#55526a',
  green:'#4caf82', greenDim:'rgba(76,175,130,0.13)',
  blue:'#5b9bd5', blueDim:'rgba(91,155,213,0.13)',
  red:'#e05c5c', redDim:'rgba(224,92,92,0.13)',
  purple:'#9b7ed4', purpleDim:'rgba(155,126,212,0.13)',
};
const SF = "'Playfair Display',Georgia,serif";
const SS = "'DM Sans',-apple-system,sans-serif";

// ── Utils ─────────────────────────────────────────────────────
function uid(){ return Math.random().toString(36).slice(2)+Date.now().toString(36); }
function fmtDate(ts){ return new Date(ts).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}); }
function fmtTime(ts){ return new Date(ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); }
function genTitle(t){ return t.length>50?t.slice(0,47)+'\u2026':t; }
function docType(txt,q){
  const s=(q+' '+txt).toLowerCase();
  if(/relat\u00f3rio|invent\u00e1rio|diagn\u00f3stico|report/.test(s)) return 'relatorio';
  if(/rascunho|of\u00edcio|email|carta|minuta/.test(s)) return 'rascunho';
  return 'analise';
}
const TYPE_META={
  relatorio:{label:'Relat\u00f3rio',bg:C.accentDim,color:C.accent,icon:'\uD83D\uDCC4'},
  analise:  {label:'An\u00e1lise',  bg:C.blueDim, color:C.blue,  icon:'\uD83D\uDCCA'},
  rascunho: {label:'Rascunho', bg:'rgba(138,135,153,0.12)',color:C.muted,icon:'\uD83D\uDCDD'},
};

// Hash muito simples para demonstração — em produção usar bcrypt no servidor
function simpleHash(s){
  let h=0;
  for(let i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;}
  return 'h'+Math.abs(h).toString(36);
}

// ── Storage ───────────────────────────────────────────────────
const load=(k,fb)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):fb;}catch{return fb;}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};

// ── Inicialização: cria admin default na primeira execução ────
function initUsers(){
  const existing = load(K_USERS, null);
  if(existing && existing.length > 0) return existing;
  const adminUser = {
    id: uid(),
    username: 'admin',
    name: 'Administrador',
    email: 'admin@nexusia.com',
    passwordHash: simpleHash('admin123'),
    role: 'admin',
    apiKey: '',
    createdAt: Date.now(),
    lastLogin: null,
    active: true,
  };
  save(K_USERS, [adminUser]);
  return [adminUser];
}

// ── Chamada Groq com streaming ────────────────────────────────
async function callGroq(apiKey,model,msgs,sys,onChunk){
  const system=sys||'Voc\u00ea \u00e9 o Nexus IA, assistente inteligente e vers\u00e1til. Responda sempre em portugu\u00eas do Brasil com clareza, precis\u00e3o e estrutura. Use Markdown: t\u00edtulos ##, listas com -, negrito **, c\u00f3digo em blocos. Seja direto e entregue valor pr\u00e1tico.';
  const res=await fetch('https://api.groq.com/openai/v1/chat/completions',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`},
    body:JSON.stringify({
      model,stream:true,max_tokens:4096,temperature:0.7,
      messages:[{role:'system',content:system},...msgs.map(m=>({role:m.role,content:m.content}))],
    }),
  });
  if(!res.ok){
    const err=await res.json().catch(()=>({}));
    throw new Error(err?.error?.message||`Erro ${res.status}`);
  }
  const reader=res.body.getReader(),dec=new TextDecoder();
  let full='';
  while(true){
    const {done,value}=await reader.read();
    if(done) break;
    for(const line of dec.decode(value).split('\n').filter(l=>l.startsWith('data: '))){
      const d=line.slice(6);
      if(d==='[DONE]') continue;
      try{const delta=JSON.parse(d).choices?.[0]?.delta?.content||'';full+=delta;onChunk(full);}catch{}
    }
  }
  return full;
}

// ── Markdown ──────────────────────────────────────────────────
function Md({content}){
  const html=useMemo(()=>{
    if(!window.marked) return (content||'').replace(/\n/g,'<br>');
    return window.marked.parse(content||'');
  },[content]);
  return e('div',{className:'prose',dangerouslySetInnerHTML:{__html:html},
    style:{fontSize:14,lineHeight:1.75,color:C.text,fontFamily:SS}});
}

// ============================================================
// TELA DE LOGIN
// ============================================================
function LoginScreen({onLogin}){
  const [mode,setMode]=useState('login'); // login | register
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [err,setErr]=useState('');
  const [loading,setLoading]=useState(false);

  const doLogin=async()=>{
    if(!username||!password){setErr('Preencha usu\u00e1rio e senha.');return;}
    setLoading(true);setErr('');
    await new Promise(r=>setTimeout(r,400));
    const users=load(K_USERS,[]);
    const u=users.find(x=>x.username===username.trim().toLowerCase());
    if(!u){setErr('Usu\u00e1rio n\u00e3o encontrado.');setLoading(false);return;}
    if(!u.active){setErr('Conta desativada. Contate um administrador.');setLoading(false);return;}
    if(u.passwordHash!==simpleHash(password)){setErr('Senha incorreta.');setLoading(false);return;}
    u.lastLogin=Date.now();
    save(K_USERS,users.map(x=>x.id===u.id?u:x));
    save(K_SESSION,{userId:u.id,loggedAt:Date.now()});
    onLogin(u);
  };

  const doRegister=async()=>{
    if(!username||!password||!name||!email){setErr('Preencha todos os campos.');return;}
    if(password.length<6){setErr('Senha deve ter ao menos 6 caracteres.');return;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){setErr('Email inv\u00e1lido.');return;}
    const users=load(K_USERS,[]);
    if(users.some(x=>x.username===username.trim().toLowerCase())){setErr('Nome de usu\u00e1rio j\u00e1 existe.');return;}
    setLoading(true);setErr('');
    await new Promise(r=>setTimeout(r,400));
    const newUser={
      id:uid(),
      username:username.trim().toLowerCase(),
      name:name.trim(),
      email:email.trim().toLowerCase(),
      passwordHash:simpleHash(password),
      role:'user',
      apiKey:'',
      createdAt:Date.now(),
      lastLogin:Date.now(),
      active:true,
    };
    save(K_USERS,[...users,newUser]);
    save(K_SESSION,{userId:newUser.id,loggedAt:Date.now()});
    onLogin(newUser);
  };

  const submit=mode==='login'?doLogin:doRegister;
  const inp={width:'100%',background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:'11px 14px',color:C.text,fontFamily:SS,fontSize:13,outline:'none',transition:'border-color 0.15s'};

  return e('div',{style:{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',padding:24,position:'relative',overflow:'hidden'}},
    // Glow background
    e('div',{style:{position:'fixed',top:'15%',left:'50%',transform:'translateX(-50%)',width:600,height:600,borderRadius:'50%',background:'radial-gradient(circle,rgba(201,168,76,0.08) 0%,transparent 70%)',pointerEvents:'none'}}),
    e('div',{style:{position:'fixed',bottom:'-10%',right:'-5%',width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(201,168,76,0.05) 0%,transparent 70%)',pointerEvents:'none'}}),

    e('div',{style:{width:'100%',maxWidth:440,background:`linear-gradient(145deg,${C.card},#161622)`,border:`1px solid ${C.border}`,borderRadius:22,padding:'40px 34px',position:'relative',boxShadow:'0 20px 60px rgba(0,0,0,0.5)'}},

      // Logo + brand
      e('div',{style:{textAlign:'center',marginBottom:32}},
        e('div',{style:{width:60,height:60,borderRadius:16,margin:'0 auto 16px',background:`linear-gradient(135deg,${C.accentL},${C.accent},#8b6914)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,color:'#0a0a10',fontWeight:900,boxShadow:`0 10px 30px ${C.accentGlow}`}},'\u2726'),
        e('div',{style:{fontFamily:SF,fontSize:28,fontWeight:900,color:C.text,letterSpacing:'-0.5px'}},'Nexus IA'),
        e('div',{style:{fontFamily:SS,fontSize:12,color:C.muted,marginTop:4,letterSpacing:'0.5px'}},'Assistente Generativo Inteligente'),
      ),

      // Tabs login / register
      e('div',{style:{display:'flex',gap:4,padding:4,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,marginBottom:22}},
        e('button',{onClick:()=>{setMode('login');setErr('');},
          style:{flex:1,padding:'8px',borderRadius:7,border:'none',cursor:'pointer',
            background:mode==='login'?C.accentDim:'transparent',
            color:mode==='login'?C.accent:C.muted,fontSize:12,fontWeight:700,fontFamily:SS,transition:'all 0.15s'}},'Entrar'),
        e('button',{onClick:()=>{setMode('register');setErr('');},
          style:{flex:1,padding:'8px',borderRadius:7,border:'none',cursor:'pointer',
            background:mode==='register'?C.accentDim:'transparent',
            color:mode==='register'?C.accent:C.muted,fontSize:12,fontWeight:700,fontFamily:SS,transition:'all 0.15s'}},'Criar conta'),
      ),

      // Form fields
      mode==='register' && e('div',{style:{marginBottom:14}},
        e('label',{style:{fontFamily:SS,fontSize:10,fontWeight:700,color:C.muted,display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.8px'}},'Nome completo'),
        e('input',{value:name,onChange:ev=>setName(ev.target.value),placeholder:'Seu nome',style:inp,
          onFocus:ev=>ev.target.style.borderColor=C.accent,onBlur:ev=>ev.target.style.borderColor=C.border}),
      ),
      mode==='register' && e('div',{style:{marginBottom:14}},
        e('label',{style:{fontFamily:SS,fontSize:10,fontWeight:700,color:C.muted,display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.8px'}},'Email'),
        e('input',{type:'email',value:email,onChange:ev=>setEmail(ev.target.value),placeholder:'voce@email.com',style:inp,
          onFocus:ev=>ev.target.style.borderColor=C.accent,onBlur:ev=>ev.target.style.borderColor=C.border}),
      ),
      e('div',{style:{marginBottom:14}},
        e('label',{style:{fontFamily:SS,fontSize:10,fontWeight:700,color:C.muted,display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.8px'}},'Usu\u00e1rio'),
        e('input',{value:username,onChange:ev=>setUsername(ev.target.value),placeholder:'nome de usu\u00e1rio',
          onKeyDown:ev=>{if(ev.key==='Enter'&&mode==='login')submit();},
          style:inp,autoFocus:true,
          onFocus:ev=>ev.target.style.borderColor=C.accent,onBlur:ev=>ev.target.style.borderColor=C.border}),
      ),
      e('div',{style:{marginBottom:16}},
        e('label',{style:{fontFamily:SS,fontSize:10,fontWeight:700,color:C.muted,display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.8px'}},'Senha'),
        e('input',{type:'password',value:password,onChange:ev=>setPassword(ev.target.value),placeholder:'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022',
          onKeyDown:ev=>{if(ev.key==='Enter')submit();},style:inp,
          onFocus:ev=>ev.target.style.borderColor=C.accent,onBlur:ev=>ev.target.style.borderColor=C.border}),
      ),

      err && e('div',{style:{marginBottom:14,padding:'9px 13px',background:C.redDim,border:`1px solid rgba(224,92,92,0.3)`,borderRadius:9,fontFamily:SS,fontSize:12,color:C.red}},'\u26A0 '+err),

      // Submit
      e('button',{onClick:submit,disabled:loading,
        style:{width:'100%',padding:'13px',borderRadius:10,border:'none',cursor:loading?'wait':'pointer',
          background:`linear-gradient(135deg,${C.accentL},${C.accent},#8b6914)`,
          color:'#0a0a10',fontFamily:SS,fontSize:13,fontWeight:800,letterSpacing:'0.3px',
          opacity:loading?0.7:1,transition:'all 0.15s',boxShadow:`0 6px 20px ${C.accentGlow}`}},
        loading?'Processando\u2026':(mode==='login'?'Entrar no Nexus IA':'Criar minha conta')),

      // Info box com credenciais demo
      mode==='login' && e('div',{style:{marginTop:20,padding:'12px 14px',background:C.accentDim,border:`1px solid rgba(201,168,76,0.2)`,borderRadius:10,fontFamily:SS,fontSize:11,color:C.muted,lineHeight:1.7}},
        e('strong',{style:{color:C.accent}},'\uD83D\uDD11 Admin padr\u00e3o: '),
        e('code',{style:{fontFamily:"'DM Mono',monospace",color:C.accentL,background:'rgba(0,0,0,0.3)',padding:'1px 6px',borderRadius:4}},'admin'),
        ' / ',
        e('code',{style:{fontFamily:"'DM Mono',monospace",color:C.accentL,background:'rgba(0,0,0,0.3)',padding:'1px 6px',borderRadius:4}},'admin123'),
        e('div',{style:{marginTop:6,fontSize:10,color:C.faint}},'Troque a senha ap\u00f3s o primeiro acesso.'),
      ),
    )
  );
}

// ============================================================
// COMPONENTES DE CHAT
// ============================================================
function Avatar({role,user}){
  if(role==='user'&&user){
    const initials=(user.name||user.username||'U').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
    return e('div',{style:{width:32,height:32,borderRadius:9,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,fontFamily:SS,
      background:`linear-gradient(135deg,${C.blue},#1a4a8b)`,color:'#fff'}},initials);
  }
  return e('div',{style:{width:32,height:32,borderRadius:9,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,fontFamily:SS,
    background:`linear-gradient(135deg,${C.accentL},${C.accent},#8b6914)`,color:'#0a0a10'}},'\u2726');
}

function Message({msg,user}){
  const isAI=msg.role==='assistant';
  return e('div',{style:{display:'flex',gap:10,marginBottom:20,flexDirection:isAI?'row':'row-reverse',animation:'nexusFade 0.3s ease'}},
    e(Avatar,{role:isAI?'ai':'user',user}),
    e('div',{style:{maxWidth:'78%'}},
      e('div',{style:{background:isAI?C.surface:C.accentDim,border:`1px solid ${isAI?C.border:'rgba(201,168,76,0.25)'}`,borderRadius:isAI?'4px 14px 14px 14px':'14px 4px 14px 14px',padding:'10px 14px'}},
        isAI?e(Md,{content:msg.content}):e('div',{style:{fontSize:14,lineHeight:1.65,color:C.text,fontFamily:SS}},msg.content),
      ),
      msg.savedDoc && e('div',{style:{marginTop:6,display:'flex',alignItems:'center',gap:6,padding:'5px 10px',background:C.greenDim,border:`1px solid rgba(76,175,130,0.3)`,borderRadius:7}},
        e('span',{style:{fontSize:11}},'\u25ab'),
        e('span',{style:{fontSize:10,color:C.green,fontWeight:700,fontFamily:SS}},`Salvo no Arquivo \u00b7 ${msg.savedDoc.name}`),
      ),
    )
  );
}

function Typing(){
  return e('div',{style:{display:'flex',gap:10,marginBottom:20}},
    e(Avatar,{role:'ai'}),
    e('div',{style:{padding:'12px 16px',background:C.surface,border:`1px solid ${C.border}`,borderRadius:'4px 14px 14px 14px',display:'flex',alignItems:'center',gap:5}},
      [0,0.2,0.4].map((d,i)=>e('div',{key:i,style:{width:6,height:6,borderRadius:'50%',background:C.accent,animation:`nexusPulse 1.2s ease-in-out ${d}s infinite`}})),
    )
  );
}

function NavItem({icon,label,active,onClick,badge}){
  const [hov,setHov]=useState(false);
  return e('div',{onClick,onMouseEnter:()=>setHov(true),onMouseLeave:()=>setHov(false),
    style:{display:'flex',alignItems:'center',gap:9,padding:'8px 10px',borderRadius:8,cursor:'pointer',marginBottom:1,
      background:active?C.accentDim:hov?C.card:'transparent',
      border:`1px solid ${active?'rgba(201,168,76,0.22)':'transparent'}`,
      color:active?C.accent:hov?C.text:C.muted,
      fontSize:12,fontWeight:500,transition:'all 0.12s',fontFamily:SS}},
    e('span',{style:{fontSize:13,width:17,textAlign:'center'}},icon),
    e('span',{style:{flex:1}},label),
    badge&&e('span',{style:{fontSize:9,fontWeight:800,padding:'2px 6px',borderRadius:99,background:C.accentDim,color:C.accent}},badge),
  );
}

function Sidebar({user,convs,activeId,onSelect,onNew,onDelete,view,onView,onLogout,userCount,cfg}){
  const isAdmin=user.role==='admin';
  const hasKey=cfg&&cfg.apiKey&&cfg.apiKey.trim().length>0;
  return e('div',{style:{width:240,minWidth:240,background:C.surface,borderRight:`1px solid ${C.border}`,display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden'}},
    // Header
    e('div',{style:{padding:'16px 14px 12px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:10}},
      e('div',{style:{width:32,height:32,borderRadius:8,flexShrink:0,background:`linear-gradient(135deg,${C.accentL},${C.accent},#8b6914)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,color:'#0a0a10',fontWeight:900}},'\u2726'),
      e('div',{style:{minWidth:0,flex:1}},
        e('div',{style:{fontFamily:SF,fontSize:16,fontWeight:900,color:C.text}},'Nexus IA'),
        e('div',{style:{fontSize:9,color:C.muted,letterSpacing:'1px',textTransform:'uppercase',fontFamily:SS}},'Assistente Generativo'),
      ),
    ),

    // User info
    e('div',{style:{padding:'10px 14px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:9}},
      e(Avatar,{role:'user',user}),
      e('div',{style:{minWidth:0,flex:1}},
        e('div',{style:{fontSize:12,fontWeight:700,color:C.text,fontFamily:SS,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},user.name),
        e('div',{style:{fontSize:10,color:isAdmin?C.accent:C.muted,fontFamily:SS,fontWeight:isAdmin?700:400}},isAdmin?'\uD83D\uDC51 Administrador':user.username),
      ),
    ),

    // Nav
    e('div',{style:{padding:'10px 8px 4px'}},
      e('div',{style:{fontSize:9,fontWeight:700,color:C.faint,letterSpacing:'1.2px',textTransform:'uppercase',padding:'0 8px 7px',fontFamily:SS}},'Principal'),
      e(NavItem,{icon:'\uD83D\uDCAC',label:'Chat',active:view==='chat',onClick:()=>onView('chat')}),
      e(NavItem,{icon:'\u25ab',label:'Arquivo de Docs',active:view==='arquivo',onClick:()=>onView('arquivo')}),
      e(NavItem,{icon:'\u2699\uFE0F',label:'Configura\u00e7\u00f5es',active:view==='settings',onClick:()=>onView('settings')}),
      isAdmin&&e(NavItem,{icon:'\uD83D\uDC65',label:'Gerenciar Usu\u00e1rios',active:view==='admin',onClick:()=>onView('admin'),badge:userCount}),
    ),

    // New chat
    e('div',{style:{padding:'0 8px 8px'}},
      e('button',{onClick:onNew,style:{width:'100%',padding:'9px',borderRadius:8,cursor:'pointer',background:C.accentDim,border:`1px solid rgba(201,168,76,0.3)`,color:C.accent,fontSize:12,fontWeight:700,fontFamily:SS,transition:'all 0.15s'},
        onMouseEnter:ev=>{ev.currentTarget.style.background=`linear-gradient(135deg,${C.accentL},${C.accent})`;ev.currentTarget.style.color='#0a0a10';},
        onMouseLeave:ev=>{ev.currentTarget.style.background=C.accentDim;ev.currentTarget.style.color=C.accent;},
      },'+ Nova conversa'),
    ),

    // Conversations
    e('div',{style:{fontSize:9,fontWeight:700,color:C.faint,letterSpacing:'1.2px',textTransform:'uppercase',padding:'4px 16px 6px',fontFamily:SS}},'Conversas'),
    e('div',{style:{flex:1,overflowY:'auto',padding:'0 8px'}},
      convs.length===0?e('div',{style:{padding:'20px 10px',textAlign:'center',fontSize:12,color:C.faint,fontFamily:SS}},'Nenhuma conversa ainda'):
      convs.map(c=>e('div',{key:c.id,onClick:()=>{onSelect(c.id);onView('chat');},
        style:{display:'flex',alignItems:'center',gap:6,padding:'7px 10px',borderRadius:8,cursor:'pointer',marginBottom:1,
          background:c.id===activeId?C.accentDim:'transparent',
          border:`1px solid ${c.id===activeId?'rgba(201,168,76,0.22)':'transparent'}`,transition:'all 0.12s'},
        onMouseEnter:ev=>{if(c.id!==activeId)ev.currentTarget.style.background=C.card;},
        onMouseLeave:ev=>{if(c.id!==activeId)ev.currentTarget.style.background='transparent';},
      },
        e('div',{style:{flex:1,minWidth:0,fontSize:11,fontWeight:c.id===activeId?600:400,color:c.id===activeId?C.accent:C.muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:SS}},c.title),
        e('button',{onClick:ev=>{ev.stopPropagation();onDelete(c.id);},style:{background:'none',border:'none',color:C.faint,cursor:'pointer',fontSize:12,padding:'0 2px',flexShrink:0}},'\u00d7'),
      ))
    ),

    // Footer
    e('div',{style:{padding:'10px 8px 12px',borderTop:`1px solid ${C.border}`,display:'flex',flexDirection:'column',gap:6}},
      e('div',{style:{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:8,background:C.card,border:`1px solid ${C.border}`}},
        e('div',{style:{width:6,height:6,borderRadius:'50%',background:hasKey?C.green:C.red,boxShadow:`0 0 7px ${hasKey?'rgba(76,175,130,0.6)':'rgba(224,92,92,0.6)'}`,flexShrink:0}}),
        e('span',{style:{fontSize:10,fontWeight:700,color:C.text,fontFamily:SS}},hasKey?'API Key configurada':'API Key não configurada'),
      ),
      e('button',{onClick:onLogout,
        style:{width:'100%',padding:'7px',borderRadius:8,cursor:'pointer',background:'transparent',border:`1px solid ${C.border}`,color:C.muted,fontSize:11,fontFamily:SS,transition:'all 0.12s',fontWeight:600},
        onMouseEnter:ev=>{ev.currentTarget.style.borderColor=C.red;ev.currentTarget.style.color=C.red;},
        onMouseLeave:ev=>{ev.currentTarget.style.borderColor=C.border;ev.currentTarget.style.color=C.muted;},
      },'\u21A9 Sair'),
    )
  );
}

function Welcome({user}){
  const s=[
    '\uD83D\uDCCB Fa\u00e7a um relat\u00f3rio sobre gest\u00e3o patrimonial',
    '\uD83D\uDCDD Rascunhe um of\u00edcio de solicita\u00e7\u00e3o formal',
    '\uD83D\uDCCA Analise pr\u00f3s e contras do teletrabalho p\u00fablico',
    '\u2696\uFE0F Explique o Decreto 12.785/2025 em linguagem simples',
    '\uD83D\uDCA1 Crie um plano de a\u00e7\u00e3o para invent\u00e1rio de bens',
    '\uD83D\uDD0D Erros mais comuns em licita\u00e7\u00f5es p\u00fablicas',
  ];
  return e('div',{style:{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'60vh',textAlign:'center',padding:'2rem'}},
    e('div',{style:{width:72,height:72,borderRadius:22,marginBottom:20,background:`linear-gradient(135deg,${C.accentL},${C.accent},#8b6914)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:30,color:'#0a0a10',fontWeight:900,boxShadow:`0 15px 40px ${C.accentGlow}`}},'\u2726'),
    e('h1',{style:{fontFamily:SF,fontSize:30,fontWeight:900,color:C.text,marginBottom:6,letterSpacing:'-0.5px'}},`Ol\u00e1, ${user.name.split(' ')[0]}`),
    e('p',{style:{color:C.muted,fontSize:14,marginBottom:32,maxWidth:480,lineHeight:1.7,fontFamily:SS}},'O que voc\u00ea precisa hoje? Textos, an\u00e1lises, relat\u00f3rios, rascunhos — estou aqui para ajudar.'),
    e('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:10,width:'100%',maxWidth:720}},
      s.map((t,i)=>e('div',{key:i,style:{padding:'13px 15px',borderRadius:11,border:`1px solid ${C.border}`,background:C.card,color:C.muted,fontSize:12,textAlign:'left',lineHeight:1.5,fontFamily:SS,cursor:'pointer',transition:'all 0.15s'},
        onMouseEnter:ev=>{ev.currentTarget.style.borderColor=C.accent;ev.currentTarget.style.color=C.text;},
        onMouseLeave:ev=>{ev.currentTarget.style.borderColor=C.border;ev.currentTarget.style.color=C.muted;},
      },t))
    )
  );
}

function ChatView({user,conv,cfg,onSend,loading}){
  const [input,setInput]=useState('');
  const bottomRef=useRef(null);
  const textRef=useRef(null);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'});},[conv?.messages?.length,loading]);
  const send=()=>{
    const t=input.trim();
    if(!t||loading) return;
    setInput('');
    if(textRef.current) textRef.current.style.height='auto';
    onSend(t);
  };
  const modelInfo=MODELS.find(m=>m.id===cfg.model);
  const hasKey=!!cfg.apiKey;
  return e('div',{style:{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',height:'100vh'}},
    // Top bar
    e('div',{style:{padding:'11px 20px',borderBottom:`1px solid ${C.border}`,background:C.surface,display:'flex',alignItems:'center',gap:12}},
      e('div',{style:{flex:1,minWidth:0}},
        conv?e('span',{style:{fontFamily:SS,fontSize:13,fontWeight:600,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'block'}},conv.title):
          e('span',{style:{fontFamily:SS,fontSize:13,color:C.muted}},'Nova conversa'),
      ),
      modelInfo&&e('div',{style:{padding:'4px 10px',borderRadius:99,background:C.accentDim,border:`1px solid rgba(201,168,76,0.2)`,fontSize:10,color:C.accent,fontFamily:SS,fontWeight:700}},modelInfo.label.split('\u2014')[0].trim()),
    ),

    // Messages
    e('div',{style:{flex:1,overflowY:'auto',padding:'24px 28px'}},
      !conv||conv.messages.length===0?e(Welcome,{user}):
        e(React.Fragment,null,
          ...conv.messages.map(m=>e(Message,{key:m.id,msg:m,user})),
          loading?e(Typing,null):null,
        ),
      e('div',{ref:bottomRef}),
    ),

    // Input
    e('div',{style:{padding:'12px 20px 16px',borderTop:`1px solid ${C.border}`,background:C.surface,flexShrink:0}},
      !hasKey && e('div',{style:{marginBottom:10,padding:'9px 14px',background:C.accentDim,border:`1px solid rgba(201,168,76,0.3)`,borderRadius:9,fontSize:12,color:C.accent,fontFamily:SS}},
        '\u26A0 Configure sua Groq API Key em Configura\u00e7\u00f5es para come\u00e7ar'),
      e('div',{style:{display:'flex',alignItems:'flex-end',gap:8,background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:'8px 8px 8px 14px'}},
        e('textarea',{ref:textRef,value:input,
          onChange:ev=>{setInput(ev.target.value);ev.target.style.height='auto';ev.target.style.height=Math.min(ev.target.scrollHeight,180)+'px';},
          onKeyDown:ev=>{if(ev.key==='Enter'&&!ev.shiftKey){ev.preventDefault();send();}},
          placeholder:hasKey?'Escreva uma mensagem\u2026 (Enter para enviar)':'Configure sua API Key primeiro\u2026',
          disabled:!hasKey||loading,rows:1,
          style:{flex:1,background:'transparent',border:'none',outline:'none',color:C.text,fontSize:14,lineHeight:1.6,resize:'none',minHeight:24,maxHeight:180,fontFamily:SS},
        }),
        e('button',{onClick:send,disabled:!hasKey||loading||!input.trim(),
          style:{width:36,height:36,borderRadius:9,border:'none',cursor:hasKey&&!loading&&input.trim()?'pointer':'not-allowed',
            background:hasKey&&!loading&&input.trim()?`linear-gradient(135deg,${C.accentL},${C.accent},#8b6914)`:C.border,
            color:hasKey&&!loading&&input.trim()?'#0a0a10':C.faint,
            fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s',flexShrink:0},
        }, loading?e('span',{style:{width:14,height:14,border:'2px solid rgba(0,0,0,0.2)',borderTopColor:'#0a0a10',borderRadius:'50%',display:'inline-block',animation:'nexusSpin 0.7s linear infinite'}}):'\u2191'),
      ),
      e('div',{style:{fontSize:11,color:C.faint,textAlign:'center',marginTop:6,fontFamily:SS}},'Nexus IA pode cometer erros. Verifique informa\u00e7\u00f5es importantes.'),
    )
  );
}

// ============================================================
// ARQUIVO DE DOCS
// ============================================================
function ArquivoView({docs,onDelete,onDownload}){
  const [filter,setFilter]=useState('todos');
  const [query,setQuery]=useState('');
  const filtered=docs.filter(d=>{
    const mt=filter==='todos'||d.type===filter;
    const q=query.toLowerCase();
    return mt&&(!q||d.name.toLowerCase().includes(q)||fmtDate(d.createdAt).includes(q));
  });
  return e('div',{style:{flex:1,overflowY:'auto',padding:24}},
    e('div',{style:{marginBottom:20}},
      e('div',{style:{fontFamily:SF,fontSize:22,fontWeight:900,color:C.text,marginBottom:4}},'Arquivo de Documentos'),
      e('div',{style:{fontSize:12,color:C.muted,fontFamily:SS}},`${docs.length} documento${docs.length!==1?'s':''} gerados pela IA`),
    ),
    e('div',{style:{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}},
      e('input',{value:query,onChange:ev=>setQuery(ev.target.value),placeholder:'\uD83D\uDD0D Buscar por nome ou data\u2026',
        style:{flex:1,minWidth:200,background:C.card,border:`1px solid ${C.border}`,borderRadius:9,padding:'8px 13px',color:C.text,fontSize:12,outline:'none',fontFamily:SS}}),
      ['todos','relatorio','analise','rascunho'].map(f=>e('button',{key:f,onClick:()=>setFilter(f),
        style:{padding:'7px 14px',borderRadius:8,cursor:'pointer',border:`1px solid ${filter===f?C.accent:C.border}`,background:filter===f?C.accentDim:C.card,color:filter===f?C.accent:C.muted,fontSize:11,fontWeight:700,fontFamily:SS,transition:'all 0.15s'}},
        {todos:'Todos',relatorio:'Relat\u00f3rios',analise:'An\u00e1lises',rascunho:'Rascunhos'}[f])),
    ),
    filtered.length===0?e('div',{style:{textAlign:'center',padding:'60px 0',color:C.muted,fontFamily:SS}},
      e('div',{style:{fontSize:42,marginBottom:14,opacity:0.5}},'\u25ab'),
      e('div',{style:{fontSize:15,fontWeight:700,color:C.text,marginBottom:6,fontFamily:SF}},'Nenhum documento ainda'),
      e('div',{style:{fontSize:12,lineHeight:1.7,maxWidth:340,margin:'0 auto'}},'Respostas longas da IA s\u00e3o salvas aqui automaticamente como documentos.'),
    ):e('div',{style:{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}},
      e('div',{style:{display:'grid',gridTemplateColumns:'2fr 1fr 100px 100px 80px',padding:'10px 18px',borderBottom:`1px solid ${C.border}`,background:'rgba(0,0,0,0.15)',fontSize:9,fontWeight:700,color:C.faint,textTransform:'uppercase',letterSpacing:'1px',fontFamily:SS}},
        e('span',null,'Nome'),e('span',null,'Data'),e('span',null,'Hora'),e('span',null,'Tipo'),e('span',null,'A\u00e7\u00f5es'),
      ),
      filtered.map((d,i)=>{
        const m=TYPE_META[d.type]||TYPE_META.analise;
        return e('div',{key:d.id,style:{display:'grid',gridTemplateColumns:'2fr 1fr 100px 100px 80px',alignItems:'center',padding:'12px 18px',borderBottom:i<filtered.length-1?`1px solid ${C.border}`:'none',transition:'background 0.12s'},
          onMouseEnter:ev=>ev.currentTarget.style.background='rgba(201,168,76,0.04)',
          onMouseLeave:ev=>ev.currentTarget.style.background='transparent'},
          e('div',{style:{display:'flex',alignItems:'center',gap:10,minWidth:0}},
            e('span',{style:{fontSize:15,flexShrink:0}},m.icon),
            e('span',{style:{fontSize:12,fontWeight:600,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:SS}},d.name),
          ),
          e('span',{style:{fontSize:11,color:C.muted,fontFamily:SS}},fmtDate(d.createdAt)),
          e('span',{style:{fontFamily:SF,fontSize:13,fontWeight:700,color:C.text}},fmtTime(d.createdAt)),
          e('span',{style:{background:m.bg,color:m.color,padding:'3px 10px',borderRadius:6,fontSize:10,fontWeight:800,fontFamily:SS,display:'inline-block',width:'fit-content'}},m.label),
          e('div',{style:{display:'flex',gap:4}},
            e('button',{onClick:()=>onDownload(d),title:'Baixar como Markdown',
              style:{background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:14,padding:'3px 6px',borderRadius:5,transition:'all 0.12s'},
              onMouseEnter:ev=>{ev.currentTarget.style.background=C.accentDim;ev.currentTarget.style.color=C.accent;},
              onMouseLeave:ev=>{ev.currentTarget.style.background='transparent';ev.currentTarget.style.color=C.muted;}},'\u2B07'),
            e('button',{onClick:()=>{if(confirm(`Excluir "${d.name}"?`))onDelete(d.id);},title:'Excluir',
              style:{background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:14,padding:'3px 6px',borderRadius:5,transition:'all 0.12s'},
              onMouseEnter:ev=>{ev.currentTarget.style.background=C.redDim;ev.currentTarget.style.color=C.red;},
              onMouseLeave:ev=>{ev.currentTarget.style.background='transparent';ev.currentTarget.style.color=C.muted;}},'\uD83D\uDDD1'),
          ),
        );
      })
    )
  );
}

// ============================================================
// CONFIGURAÇÕES
// ============================================================
function SettingsView({user,cfg,onSave,onUpdateUser}){
  const [apiKey,setApiKey]=useState(cfg.apiKey||'');
  const [model,setModel]=useState(cfg.model||DEFAULT_MODEL);
  const [sys,setSys]=useState(cfg.systemPrompt||'');
  const [name,setName]=useState(user.name);
  const [email,setEmail]=useState(user.email);
  const [newPass,setNewPass]=useState('');
  const [oldPass,setOldPass]=useState('');
  const [saved,setSaved]=useState(false);
  const [passErr,setPassErr]=useState('');
  const [passOk,setPassOk]=useState(false);

  const doSave=()=>{
    if(apiKey && !apiKey.trim().startsWith('gsk_')){
      alert('⚠️ A Groq API Key deve começar com "gsk_". Verifique se copiou corretamente.');
      return;
    }
    onSave({...cfg,apiKey:apiKey.trim(),model,systemPrompt:sys});
    if(name!==user.name||email!==user.email){
      onUpdateUser({...user,name,email});
    }
    setSaved(true);
    setTimeout(()=>setSaved(false),2000);
  };

  const changePass=()=>{
    setPassErr('');setPassOk(false);
    if(!oldPass||!newPass){setPassErr('Preencha as duas senhas.');return;}
    if(simpleHash(oldPass)!==user.passwordHash){setPassErr('Senha atual incorreta.');return;}
    if(newPass.length<6){setPassErr('Nova senha deve ter ao menos 6 caracteres.');return;}
    onUpdateUser({...user,passwordHash:simpleHash(newPass)});
    setOldPass('');setNewPass('');setPassOk(true);
    setTimeout(()=>setPassOk(false),2500);
  };

  const inp={width:'100%',background:C.surface,border:`1px solid ${C.border}`,borderRadius:9,padding:'10px 13px',color:C.text,fontSize:13,outline:'none',fontFamily:SS,transition:'border-color 0.15s'};
  const label={fontSize:10,fontWeight:700,color:C.muted,display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.8px',fontFamily:SS};
  const section={marginBottom:28,padding:20,background:C.card,border:`1px solid ${C.border}`,borderRadius:12};
  const secTitle={fontFamily:SF,fontSize:15,fontWeight:900,color:C.text,marginBottom:14,display:'flex',alignItems:'center',gap:8};

  return e('div',{style:{flex:1,overflowY:'auto',padding:24,maxWidth:700}},
    e('div',{style:{marginBottom:24}},
      e('div',{style:{fontFamily:SF,fontSize:22,fontWeight:900,color:C.text,marginBottom:4}},'Configura\u00e7\u00f5es'),
      e('div',{style:{fontSize:12,color:C.muted,fontFamily:SS}},'Personalize sua experi\u00eancia no Nexus IA'),
    ),

    // Section: API + IA
    e('div',{style:section},
      e('div',{style:secTitle},e('span',null,'\uD83E\uDD16'),' Intelig\u00eancia Artificial'),
      e('div',{style:{marginBottom:14}},
        e('label',{style:label},'Groq API Key'),
        e('input',{type:'password',value:apiKey,onChange:ev=>setApiKey(ev.target.value),placeholder:'gsk_...',style:{...inp,borderColor:apiKey?C.green:C.border}}),
        e('div',{style:{fontSize:11,color:C.faint,marginTop:5,fontFamily:SS}},'Obtenha gratuitamente em ',
          e('a',{href:'https://console.groq.com',target:'_blank',rel:'noopener',style:{color:C.accent,textDecoration:'underline'}},'console.groq.com'),
        ),
      ),
      e('div',{style:{marginBottom:14}},
        e('label',{style:label},'Modelo de IA'),
        e('select',{value:model,onChange:ev=>setModel(ev.target.value),style:{...inp,cursor:'pointer'}},
          MODELS.map(m=>e('option',{key:m.id,value:m.id},m.label)),
        ),
        e('div',{style:{fontSize:11,color:C.faint,marginTop:5,fontFamily:SS}},
          'Llama 3.1 8B é o padrão (rápido e sem limites). Use GPT-OSS 120B para tarefas complexas.',
        ),
      ),
      e('div',null,
        e('label',{style:label},'Prompt do Sistema (opcional)'),
        e('textarea',{value:sys,onChange:ev=>setSys(ev.target.value),
          placeholder:'Personalize o comportamento da IA. Ex: Voc\u00ea \u00e9 um especialista em gest\u00e3o p\u00fablica brasileira...',
          rows:4,style:{...inp,resize:'vertical',lineHeight:1.6,fontFamily:SS}}),
      ),
    ),

    // Section: Perfil
    e('div',{style:section},
      e('div',{style:secTitle},e('span',null,'\uD83D\uDC64'),' Meu Perfil'),
      e('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}},
        e('div',null,
          e('label',{style:label},'Nome'),
          e('input',{value:name,onChange:ev=>setName(ev.target.value),style:inp}),
        ),
        e('div',null,
          e('label',{style:label},'Email'),
          e('input',{type:'email',value:email,onChange:ev=>setEmail(ev.target.value),style:inp}),
        ),
      ),
      e('div',{style:{display:'flex',gap:8,alignItems:'center'}},
        e('div',{style:{fontSize:11,color:C.muted,fontFamily:SS}},'Usu\u00e1rio: ',e('code',{style:{color:C.accent,fontFamily:"'DM Mono',monospace",background:'rgba(0,0,0,0.3)',padding:'1px 6px',borderRadius:4}},user.username)),
        user.role==='admin'&&e('span',{style:{padding:'2px 8px',borderRadius:99,background:C.accentDim,color:C.accent,fontSize:9,fontWeight:800,fontFamily:SS}},'ADMIN'),
      ),
    ),

    // Section: Senha
    e('div',{style:section},
      e('div',{style:secTitle},e('span',null,'\uD83D\uDD11'),' Alterar Senha'),
      e('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}},
        e('div',null,
          e('label',{style:label},'Senha atual'),
          e('input',{type:'password',value:oldPass,onChange:ev=>setOldPass(ev.target.value),placeholder:'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022',style:inp}),
        ),
        e('div',null,
          e('label',{style:label},'Nova senha'),
          e('input',{type:'password',value:newPass,onChange:ev=>setNewPass(ev.target.value),placeholder:'m\u00ednimo 6 caracteres',style:inp}),
        ),
      ),
      passErr&&e('div',{style:{padding:'8px 12px',background:C.redDim,border:`1px solid rgba(224,92,92,0.3)`,borderRadius:8,fontSize:11,color:C.red,fontFamily:SS,marginBottom:10}},'\u26A0 '+passErr),
      passOk&&e('div',{style:{padding:'8px 12px',background:C.greenDim,border:`1px solid rgba(76,175,130,0.3)`,borderRadius:8,fontSize:11,color:C.green,fontFamily:SS,marginBottom:10}},'\u2713 Senha alterada com sucesso.'),
      e('button',{onClick:changePass,
        style:{padding:'9px 20px',borderRadius:9,border:`1px solid ${C.border}`,cursor:'pointer',background:C.elevated,color:C.text,fontSize:12,fontWeight:700,fontFamily:SS,transition:'all 0.15s'},
        onMouseEnter:ev=>{ev.currentTarget.style.borderColor=C.accent;ev.currentTarget.style.color=C.accent;},
        onMouseLeave:ev=>{ev.currentTarget.style.borderColor=C.border;ev.currentTarget.style.color=C.text;}
      },'Alterar senha'),
    ),

    // Save
    e('button',{onClick:doSave,
      style:{padding:'12px 32px',borderRadius:10,border:'none',cursor:'pointer',
        background:saved?C.green:`linear-gradient(135deg,${C.accentL},${C.accent},#8b6914)`,
        color:'#0a0a10',fontSize:13,fontWeight:800,fontFamily:SS,transition:'all 0.2s',letterSpacing:'0.3px',
        boxShadow:saved?'none':`0 6px 20px ${C.accentGlow}`}},
      saved?'\u2713 Salvo com sucesso':'Salvar configura\u00e7\u00f5es'),
  );
}

// ============================================================
// PAINEL ADMINISTRATIVO
// ============================================================
function AdminView({currentUser,onUpdate}){
  const [users,setUsers]=useState(()=>load(K_USERS,[]));
  const [showNew,setShowNew]=useState(false);
  const [filter,setFilter]=useState('todos');
  const [query,setQuery]=useState('');
  const [nUser,setNUser]=useState({username:'',name:'',email:'',password:'',role:'user'});
  const [nErr,setNErr]=useState('');

  const reloadUsers=()=>setUsers(load(K_USERS,[]));

  const toggleActive=(id)=>{
    if(id===currentUser.id){alert('Voc\u00ea n\u00e3o pode desativar sua pr\u00f3pria conta.');return;}
    const updated=users.map(u=>u.id===id?{...u,active:!u.active}:u);
    save(K_USERS,updated);
    setUsers(updated);
  };

  const deleteUser=(id)=>{
    if(id===currentUser.id){alert('Voc\u00ea n\u00e3o pode excluir sua pr\u00f3pria conta.');return;}
    const u=users.find(x=>x.id===id);
    if(!confirm(`Excluir o usu\u00e1rio "${u.username}"? Esta a\u00e7\u00e3o \u00e9 permanente.`)) return;
    const updated=users.filter(x=>x.id!==id);
    save(K_USERS,updated);
    setUsers(updated);
  };

  const toggleRole=(id)=>{
    if(id===currentUser.id){alert('Voc\u00ea n\u00e3o pode alterar seu pr\u00f3prio papel.');return;}
    const updated=users.map(u=>u.id===id?{...u,role:u.role==='admin'?'user':'admin'}:u);
    save(K_USERS,updated);
    setUsers(updated);
  };

  const createUser=()=>{
    setNErr('');
    if(!nUser.username||!nUser.name||!nUser.email||!nUser.password){setNErr('Preencha todos os campos.');return;}
    if(nUser.password.length<6){setNErr('Senha deve ter ao menos 6 caracteres.');return;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nUser.email)){setNErr('Email inv\u00e1lido.');return;}
    if(users.some(x=>x.username===nUser.username.trim().toLowerCase())){setNErr('Nome de usu\u00e1rio j\u00e1 existe.');return;}
    const newU={
      id:uid(),
      username:nUser.username.trim().toLowerCase(),
      name:nUser.name.trim(),
      email:nUser.email.trim().toLowerCase(),
      passwordHash:simpleHash(nUser.password),
      role:nUser.role,
      apiKey:'',
      createdAt:Date.now(),
      lastLogin:null,
      active:true,
    };
    const updated=[...users,newU];
    save(K_USERS,updated);
    setUsers(updated);
    setNUser({username:'',name:'',email:'',password:'',role:'user'});
    setShowNew(false);
  };

  const resetPassword=(id)=>{
    const newPass=prompt('Digite a nova senha (m\u00ednimo 6 caracteres):');
    if(!newPass) return;
    if(newPass.length<6){alert('Senha deve ter ao menos 6 caracteres.');return;}
    const updated=users.map(u=>u.id===id?{...u,passwordHash:simpleHash(newPass)}:u);
    save(K_USERS,updated);
    setUsers(updated);
    alert('Senha redefinida com sucesso.');
  };

  const filtered=users.filter(u=>{
    const mt=filter==='todos'||(filter==='admin'&&u.role==='admin')||(filter==='user'&&u.role==='user')||(filter==='inativos'&&!u.active);
    const q=query.toLowerCase();
    return mt&&(!q||u.username.toLowerCase().includes(q)||u.name.toLowerCase().includes(q)||u.email.toLowerCase().includes(q));
  });

  const inp={width:'100%',background:C.surface,border:`1px solid ${C.border}`,borderRadius:9,padding:'9px 12px',color:C.text,fontSize:12,outline:'none',fontFamily:SS};
  const label={fontSize:10,fontWeight:700,color:C.muted,display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.8px',fontFamily:SS};

  const stats={
    total:users.length,
    admins:users.filter(u=>u.role==='admin').length,
    active:users.filter(u=>u.active).length,
    inactive:users.filter(u=>!u.active).length,
  };

  return e('div',{style:{flex:1,overflowY:'auto',padding:24}},
    // Header
    e('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:20,flexWrap:'wrap',gap:12}},
      e('div',null,
        e('div',{style:{display:'flex',alignItems:'center',gap:10,marginBottom:4}},
          e('div',{style:{fontFamily:SF,fontSize:22,fontWeight:900,color:C.text}},'Gerenciar Usu\u00e1rios'),
          e('span',{style:{padding:'3px 10px',borderRadius:99,background:C.accentDim,color:C.accent,fontSize:10,fontWeight:800,fontFamily:SS,letterSpacing:'0.5px'}},'ADMIN'),
        ),
        e('div',{style:{fontSize:12,color:C.muted,fontFamily:SS}},'Cadastre, edite e controle acessos ao sistema'),
      ),
      e('button',{onClick:()=>setShowNew(!showNew),
        style:{padding:'10px 20px',borderRadius:10,border:'none',cursor:'pointer',
          background:showNew?C.surface:`linear-gradient(135deg,${C.accentL},${C.accent},#8b6914)`,
          color:showNew?C.muted:'#0a0a10',fontSize:12,fontWeight:800,fontFamily:SS,transition:'all 0.15s',
          boxShadow:showNew?'none':`0 5px 15px ${C.accentGlow}`}},
        showNew?'\u2715 Cancelar':'+ Novo usu\u00e1rio'),
    ),

    // Stats cards
    e('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10,marginBottom:18}},
      [
        {label:'Total',value:stats.total,color:C.accent},
        {label:'Administradores',value:stats.admins,color:C.purple},
        {label:'Ativos',value:stats.active,color:C.green},
        {label:'Inativos',value:stats.inactive,color:C.muted},
      ].map((s,i)=>e('div',{key:i,style:{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'12px 16px'}},
        e('div',{style:{fontSize:9,color:C.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',fontFamily:SS,marginBottom:4}},s.label),
        e('div',{style:{fontFamily:SF,fontSize:26,fontWeight:900,color:s.color}},s.value),
      )),
    ),

    // Form novo usuário
    showNew&&e('div',{style:{background:C.card,border:`1px solid ${C.accent}`,borderRadius:14,padding:20,marginBottom:18,animation:'nexusFade 0.25s ease'}},
      e('div',{style:{fontFamily:SF,fontSize:14,fontWeight:900,color:C.accent,marginBottom:14}},'Cadastrar novo usu\u00e1rio'),
      e('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}},
        e('div',null,e('label',{style:label},'Nome completo'),
          e('input',{value:nUser.name,onChange:ev=>setNUser({...nUser,name:ev.target.value}),style:inp}),
        ),
        e('div',null,e('label',{style:label},'Email'),
          e('input',{type:'email',value:nUser.email,onChange:ev=>setNUser({...nUser,email:ev.target.value}),style:inp}),
        ),
        e('div',null,e('label',{style:label},'Usu\u00e1rio'),
          e('input',{value:nUser.username,onChange:ev=>setNUser({...nUser,username:ev.target.value}),style:inp}),
        ),
        e('div',null,e('label',{style:label},'Senha inicial'),
          e('input',{type:'text',value:nUser.password,onChange:ev=>setNUser({...nUser,password:ev.target.value}),style:inp,placeholder:'m\u00ednimo 6 caracteres'}),
        ),
        e('div',{style:{gridColumn:'span 2'}},e('label',{style:label},'Papel'),
          e('select',{value:nUser.role,onChange:ev=>setNUser({...nUser,role:ev.target.value}),style:{...inp,cursor:'pointer'}},
            e('option',{value:'user'},'Usu\u00e1rio comum'),
            e('option',{value:'admin'},'Administrador'),
          ),
        ),
      ),
      nErr&&e('div',{style:{padding:'8px 12px',background:C.redDim,border:`1px solid rgba(224,92,92,0.3)`,borderRadius:8,fontSize:11,color:C.red,fontFamily:SS,marginBottom:10}},'\u26A0 '+nErr),
      e('button',{onClick:createUser,
        style:{padding:'10px 22px',borderRadius:9,border:'none',cursor:'pointer',background:`linear-gradient(135deg,${C.accentL},${C.accent},#8b6914)`,color:'#0a0a10',fontSize:12,fontWeight:800,fontFamily:SS}},
        'Cadastrar usu\u00e1rio'),
    ),

    // Filters
    e('div',{style:{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}},
      e('input',{value:query,onChange:ev=>setQuery(ev.target.value),placeholder:'\uD83D\uDD0D Buscar por nome, usu\u00e1rio ou email\u2026',
        style:{flex:1,minWidth:220,background:C.card,border:`1px solid ${C.border}`,borderRadius:9,padding:'8px 13px',color:C.text,fontSize:12,outline:'none',fontFamily:SS}}),
      [['todos','Todos'],['admin','Admins'],['user','Usu\u00e1rios'],['inativos','Inativos']].map(([f,l])=>
        e('button',{key:f,onClick:()=>setFilter(f),
          style:{padding:'7px 14px',borderRadius:8,cursor:'pointer',border:`1px solid ${filter===f?C.accent:C.border}`,background:filter===f?C.accentDim:C.card,color:filter===f?C.accent:C.muted,fontSize:11,fontWeight:700,fontFamily:SS,transition:'all 0.15s'}},l)),
    ),

    // Table
    e('div',{style:{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}},
      e('div',{style:{display:'grid',gridTemplateColumns:'2fr 1.5fr 2fr 90px 100px 140px',padding:'10px 18px',borderBottom:`1px solid ${C.border}`,background:'rgba(0,0,0,0.15)',fontSize:9,fontWeight:700,color:C.faint,textTransform:'uppercase',letterSpacing:'1px',fontFamily:SS}},
        e('span',null,'Nome'),e('span',null,'Usu\u00e1rio'),e('span',null,'Email'),e('span',null,'Papel'),e('span',null,'Status'),e('span',null,'A\u00e7\u00f5es'),
      ),
      filtered.length===0?e('div',{style:{padding:'40px 20px',textAlign:'center',color:C.muted,fontSize:13,fontFamily:SS}},'Nenhum usu\u00e1rio encontrado'):
      filtered.map((u,i)=>e('div',{key:u.id,style:{display:'grid',gridTemplateColumns:'2fr 1.5fr 2fr 90px 100px 140px',alignItems:'center',padding:'11px 18px',borderBottom:i<filtered.length-1?`1px solid ${C.border}`:'none',transition:'background 0.12s',opacity:u.active?1:0.55},
        onMouseEnter:ev=>ev.currentTarget.style.background='rgba(201,168,76,0.04)',
        onMouseLeave:ev=>ev.currentTarget.style.background='transparent'},
        e('div',{style:{display:'flex',alignItems:'center',gap:9,minWidth:0}},
          e(Avatar,{role:'user',user:u}),
          e('div',{style:{minWidth:0}},
            e('div',{style:{fontSize:12,fontWeight:700,color:C.text,fontFamily:SS,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},u.name),
            e('div',{style:{fontSize:10,color:C.faint,fontFamily:SS}},u.lastLogin?`\u00faltimo: ${fmtDate(u.lastLogin)}`:'nunca acessou'),
          ),
        ),
        e('code',{style:{fontSize:11,color:C.accent,fontFamily:"'DM Mono',monospace"}},u.username),
        e('span',{style:{fontSize:11,color:C.muted,fontFamily:SS,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},u.email),
        e('span',{onClick:()=>toggleRole(u.id),
          style:{padding:'3px 10px',borderRadius:6,fontSize:10,fontWeight:800,fontFamily:SS,cursor:u.id===currentUser.id?'not-allowed':'pointer',width:'fit-content',
            background:u.role==='admin'?C.purpleDim:C.blueDim,color:u.role==='admin'?C.purple:C.blue,
            border:`1px solid ${u.role==='admin'?'rgba(155,126,212,0.3)':'rgba(91,155,213,0.3)'}`}},
          u.role==='admin'?'\uD83D\uDC51 ADMIN':'USU\u00c1RIO'),
        e('span',{onClick:()=>toggleActive(u.id),
          style:{padding:'3px 10px',borderRadius:6,fontSize:10,fontWeight:800,fontFamily:SS,cursor:u.id===currentUser.id?'not-allowed':'pointer',width:'fit-content',
            background:u.active?C.greenDim:C.redDim,color:u.active?C.green:C.red,
            border:`1px solid ${u.active?'rgba(76,175,130,0.3)':'rgba(224,92,92,0.3)'}`}},
          u.active?'\u25CF ATIVO':'\u25CB INATIVO'),
        e('div',{style:{display:'flex',gap:3}},
          e('button',{onClick:()=>resetPassword(u.id),title:'Redefinir senha',
            style:{background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:13,padding:'4px 7px',borderRadius:5,transition:'all 0.12s'},
            onMouseEnter:ev=>{ev.currentTarget.style.background=C.accentDim;ev.currentTarget.style.color=C.accent;},
            onMouseLeave:ev=>{ev.currentTarget.style.background='transparent';ev.currentTarget.style.color=C.muted;}},'\uD83D\uDD11'),
          e('button',{onClick:()=>deleteUser(u.id),title:'Excluir usu\u00e1rio',disabled:u.id===currentUser.id,
            style:{background:'none',border:'none',color:u.id===currentUser.id?C.faint:C.muted,cursor:u.id===currentUser.id?'not-allowed':'pointer',fontSize:13,padding:'4px 7px',borderRadius:5,transition:'all 0.12s'},
            onMouseEnter:ev=>{if(u.id!==currentUser.id){ev.currentTarget.style.background=C.redDim;ev.currentTarget.style.color=C.red;}},
            onMouseLeave:ev=>{ev.currentTarget.style.background='transparent';ev.currentTarget.style.color=u.id===currentUser.id?C.faint:C.muted;}},'\uD83D\uDDD1'),
        ),
      ))
    ),

    // Help text
    e('div',{style:{marginTop:20,padding:'12px 14px',background:C.accentDim,border:`1px solid rgba(201,168,76,0.2)`,borderRadius:10,fontFamily:SS,fontSize:11,color:C.muted,lineHeight:1.7}},
      e('strong',{style:{color:C.accent}},'\u2139 Dicas: '),'Clique no bot\u00e3o de papel para promover/rebaixar um usu\u00e1rio. Clique no status para ativar/desativar. Use \uD83D\uDD11 para redefinir senhas. Voc\u00ea n\u00e3o pode alterar ou excluir sua pr\u00f3pria conta.',
    ),
  );
}

// ============================================================
// APP PRINCIPAL
// ============================================================
function NexusIA(){
  const [users,setUsers]=useState(()=>initUsers());
  const [currentUser,setCurrentUser]=useState(()=>{
    const session=load(K_SESSION,null);
    if(!session) return null;
    const allUsers=load(K_USERS,[]);
    const u=allUsers.find(x=>x.id===session.userId);
    return u&&u.active?u:null;
  });
  const [cfg,setCfg]=useState(()=>load(K_CFG,{apiKey:'',model:DEFAULT_MODEL,systemPrompt:''}));
  const [convs,setConvs]=useState(()=>load(K_CONVS,[]));
  const [activeId,setActiveId]=useState(()=>load(K_CONVS,[])[0]?.id||null);
  const [docs,setDocs]=useState(()=>load(K_DOCS,[]));
  const [loading,setLoading]=useState(false);
  const [view,setView]=useState('chat');

  useEffect(()=>{save(K_CONVS,convs);},[convs]);
  useEffect(()=>{save(K_DOCS,docs);},[docs]);
  useEffect(()=>{save(K_CFG,cfg);},[cfg]);

  const activeConv=convs.find(c=>c.id===activeId)||null;

  const handleLogin=useCallback(u=>{
    setCurrentUser(u);
    setUsers(load(K_USERS,[]));
    setView('chat');
  },[]);

  const handleLogout=useCallback(()=>{
    localStorage.removeItem(K_SESSION);
    setCurrentUser(null);
  },[]);

  const handleUpdateUser=useCallback(updatedUser=>{
    const all=load(K_USERS,[]);
    const newAll=all.map(u=>u.id===updatedUser.id?updatedUser:u);
    save(K_USERS,newAll);
    setUsers(newAll);
    if(updatedUser.id===currentUser?.id) setCurrentUser(updatedUser);
  },[currentUser]);

  const newConv=useCallback(()=>{
    const c={id:uid(),title:'Nova conversa',messages:[],createdAt:Date.now(),updatedAt:Date.now()};
    setConvs(prev=>[c,...prev]);setActiveId(c.id);setView('chat');return c;
  },[]);

  const deleteConv=useCallback(id=>{
    setConvs(prev=>prev.filter(c=>c.id!==id));
    setActiveId(prev=>prev===id?convs.find(c=>c.id!==id)?.id||null:prev);
  },[convs]);

  const deleteDoc=useCallback(id=>setDocs(prev=>prev.filter(d=>d.id!==id)),[]);

  const downloadDoc=useCallback(d=>{
    const md=`# ${d.name}\n\n_Gerado em ${fmtDate(d.createdAt)} ${fmtTime(d.createdAt)}_\n\n---\n\n${d.content}`;
    const blob=new Blob([md],{type:'text/markdown'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=`${d.name.slice(0,50).replace(/[^a-z0-9]/gi,'-')}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  },[]);

  const handleSaveCfg=useCallback(s=>{
    setCfg(s);
    save(K_CFG,s); // Força salvamento imediato no localStorage
  },[]);

  const handleSend=useCallback(async text=>{
    const currentCfg = load(K_CFG,cfg); // Recarrega config do localStorage
    if(!currentCfg.apiKey||!currentCfg.apiKey.trim()){
      alert('⚠️ Configure sua Groq API Key em Configurações antes de enviar mensagens.');
      return;
    }
    if(loading) return;
    let conv=activeConv;
    if(!conv){conv={id:uid(),title:genTitle(text),messages:[],createdAt:Date.now(),updatedAt:Date.now()};}
    const userMsg={id:uid(),role:'user',content:text,timestamp:Date.now()};
    const aiId=uid();
    const aiMsg={id:aiId,role:'assistant',content:'',timestamp:Date.now()};
    const updated={...conv,title:conv.messages.length===0?genTitle(text):conv.title,messages:[...conv.messages,userMsg,aiMsg],updatedAt:Date.now()};
    setConvs(prev=>{const ex=prev.find(c=>c.id===updated.id);return ex?prev.map(c=>c.id===updated.id?updated:c):[updated,...prev];});
    setActiveId(updated.id);setLoading(true);
    try{
      let final='';
      await callGroq(currentCfg.apiKey,currentCfg.model||DEFAULT_MODEL,[...conv.messages,userMsg],currentCfg.systemPrompt,partial=>{
        final=partial;
        setConvs(prev=>prev.map(c=>c.id===updated.id?{...c,messages:c.messages.map(m=>m.id===aiId?{...m,content:partial}:m)}:c));
      });
      if(final.length>400){
        const doc={id:uid(),name:genTitle(text),content:final,type:docType(final,text),createdAt:Date.now()};
        setDocs(prev=>[doc,...prev]);
        setConvs(prev=>prev.map(c=>c.id===updated.id?{...c,messages:c.messages.map(m=>m.id===aiId?{...m,savedDoc:doc}:m)}:c));
      }
    }catch(err){
      let errorMsg = err.message;
      if(errorMsg.includes('too large') || errorMsg.includes('Limit')){
        errorMsg = 'Limite de tokens atingido. Tente: (1) usar mensagens mais curtas, (2) trocar para Llama 3.1 8B em Configurações, ou (3) aguardar 1 minuto.';
      }
      setConvs(prev=>prev.map(c=>c.id===updated.id?{...c,messages:c.messages.map(m=>m.id===aiId?{...m,content:`❌ Erro: ${errorMsg}`}:m)}:c));
    }
    setLoading(false);
  },[activeConv,loading,cfg]);

  if(!currentUser) return e(LoginScreen,{onLogin:handleLogin});

  const userCount=load(K_USERS,[]).length;

  return e('div',{style:{display:'flex',height:'100vh',overflow:'hidden',background:C.bg,color:C.text}},
    e(Sidebar,{user:currentUser,convs,activeId,onSelect:setActiveId,onNew:newConv,onDelete:deleteConv,view,onView:setView,onLogout:handleLogout,userCount,cfg}),
    view==='chat'?e(ChatView,{user:currentUser,conv:activeConv,cfg,onSend:handleSend,loading}):null,
    view==='arquivo'?e(ArquivoView,{docs,onDelete:deleteDoc,onDownload:downloadDoc}):null,
    view==='settings'?e(SettingsView,{user:currentUser,cfg,onSave:handleSaveCfg,onUpdateUser:handleUpdateUser}):null,
    view==='admin'&&currentUser.role==='admin'?e(AdminView,{currentUser,onUpdate:handleUpdateUser}):null,
  );
}

// ── CSS Global ────────────────────────────────────────────────
const st=document.createElement('style');
st.textContent=`
*{box-sizing:border-box;margin:0;padding:0;}
html,body,#root{height:100%;}
body{background:#0a0a10;color:#ede9e2;-webkit-font-smoothing:antialiased;}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:#55526a;border-radius:99px;}
::-webkit-scrollbar-thumb:hover{background:#c9a84c;}
@keyframes nexusFade{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
@keyframes nexusPulse{0%,100%{opacity:0.3}50%{opacity:1}}
@keyframes nexusSpin{to{transform:rotate(360deg)}}
.prose h1,.prose h2,.prose h3{font-family:'Playfair Display',serif;margin:1.2em 0 0.5em;color:#ede9e2;font-weight:900;}
.prose h1{font-size:1.5rem}.prose h2{font-size:1.25rem}.prose h3{font-size:1.1rem}
.prose p{margin:0.6em 0;}
.prose ul,.prose ol{padding-left:1.5em;margin:0.6em 0;}
.prose li{margin:0.25em 0;}
.prose strong{color:#ede9e2;font-weight:700;}
.prose em{color:#8a8799;}
.prose code:not([class]){background:#0a0a10;color:#e8c96d;padding:2px 6px;border-radius:4px;font-family:'DM Mono',monospace;font-size:0.85em;border:1px solid #252535;}
.prose pre{background:#080810!important;border:1px solid #252535;border-radius:10px;padding:14px;overflow:auto;margin:0.8em 0;}
.prose pre code{background:transparent;border:none;padding:0;color:#ede9e2;}
.prose blockquote{border-left:3px solid #c9a84c;padding-left:1em;color:#8a8799;font-style:italic;margin:0.8em 0;}
.prose table{width:100%;border-collapse:collapse;margin:0.8em 0;font-size:0.9em;}
.prose th{background:#1a1a25;color:#ede9e2;padding:8px 12px;text-align:left;border:1px solid #252535;font-weight:600;}
.prose td{padding:7px 12px;border:1px solid #252535;color:#8a8799;}
.prose tr:nth-child(even) td{background:#13131c;}
.prose a{color:#c9a84c;text-decoration:underline;}
select option{background:#1a1a25;color:#ede9e2;}
input::placeholder,textarea::placeholder{color:#55526a;font-style:italic;}
`;
document.head.appendChild(st);

window.__NexusIA=NexusIA;

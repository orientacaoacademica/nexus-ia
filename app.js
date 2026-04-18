const { useState, useEffect, useRef, useCallback, useMemo } = React;
const e = React.createElement;

// ── Models ────────────────────────────────────────────────────────
const MODELS = [
  { id:'openai/gpt-oss-120b',                       label:'GPT-OSS 120B — Inteligência máxima',   ctx:131072 },
  { id:'moonshotai/kimi-k2-0905',                   label:'Kimi K2 — Contexto gigante (262k)',    ctx:262144 },
  { id:'llama-3.3-70b-versatile',                   label:'Llama 3.3 70B — Versátil geral',       ctx:128000 },
  { id:'meta-llama/llama-4-scout-17b-16e-instruct', label:'Llama 4 Scout — Multimodal rápido',   ctx:131072 },
  { id:'qwen/qwen3-32b',                            label:'Qwen 3 32B — Raciocínio estruturado',  ctx:131072 },
  { id:'llama-3.1-8b-instant',                      label:'Llama 3.1 8B — Ultra rápido',          ctx:128000 },
  { id:'openai/gpt-oss-20b',                        label:'GPT-OSS 20B — Balanceado veloz',       ctx:131072 },
];
const DEFAULT_MODEL = 'openai/gpt-oss-120b';

const K_USERS   = 'nexus-users-v2';
const K_SESSION = 'nexus-session-v2';
const K_CFG     = 'nexus-cfg-v2';
const K_CONVS   = 'nexus-convs-v2';
const K_DOCS    = 'nexus-docs-v2';

// ── Slash commands ────────────────────────────────────────────────
const SLASH_COMMANDS = [
  { cmd:'/ajuda',        desc:'Lista todos os comandos',                   icon:'❓', cat:'sistema' },
  // Acadêmico
  { cmd:'/oficio',       desc:'Gera ofício institucional formal',           icon:'📄', cat:'acadêmico' },
  { cmd:'/resumo',       desc:'Cria resumo acadêmico (ABNT NBR 6028)',      icon:'📝', cat:'acadêmico' },
  { cmd:'/revisar',      desc:'Revisa texto com normas ABNT',               icon:'🔍', cat:'acadêmico' },
  { cmd:'/metodologia',  desc:'Sugere metodologia de pesquisa',             icon:'🔬', cat:'acadêmico' },
  { cmd:'/cronograma',   desc:'Cria cronograma de pós-graduação',           icon:'📅', cat:'acadêmico' },
  { cmd:'/banca',        desc:'Simula perguntas de banca examinadora',      icon:'🎓', cat:'acadêmico' },
  { cmd:'/abnt',         desc:'Formata referência bibliográfica ABNT',      icon:'📚', cat:'acadêmico' },
  { cmd:'/briefing',     desc:'Briefing de reunião de orientação',          icon:'📋', cat:'acadêmico' },
  // Técnico / Código (inspirado no Claude Code)
  { cmd:'/projeto',      desc:'Workflow completo: explorar → projetar → revisar', icon:'🏗', cat:'técnico' },
  { cmd:'/explorar',     desc:'Analisa código/arquitetura em profundidade', icon:'🧭', cat:'técnico' },
  { cmd:'/arquitetura',  desc:'Desenha arquitetura com 3 abordagens',       icon:'📐', cat:'técnico' },
  { cmd:'/revisar-codigo', desc:'Revisa código (bugs, clean code, DRY)',    icon:'🧹', cat:'técnico' },
  { cmd:'/explicar',     desc:'Explica código trecho por trecho',           icon:'💡', cat:'técnico' },
  { cmd:'/testes',       desc:'Gera testes unitários para o código',        icon:'🧪', cat:'técnico' },
  { cmd:'/commit',       desc:'Mensagem de commit + PR description',         icon:'💾', cat:'técnico' },
  // Profissional / Pública
  { cmd:'/relatorio',    desc:'Relatório técnico estruturado',               icon:'📊', cat:'profissional' },
  { cmd:'/analise',      desc:'Análise crítica estruturada',                 icon:'⚖️', cat:'profissional' },
  { cmd:'/plano',        desc:'Plano de ação com prazos e responsáveis',    icon:'🎯', cat:'profissional' },
  { cmd:'/parecer',      desc:'Parecer técnico fundamentado',                icon:'⚖', cat:'profissional' },
  // Sistema
  { cmd:'/limpar',       desc:'Limpa histórico desta conversa',             icon:'🗑', cat:'sistema' },
];

const SYSTEM_PROMPTS = {
  academic:`Você é o Nexus IA, assistente acadêmico especializado em pós-graduação brasileira. Auxilia orientadores, coordenadores e pesquisadores com dissertações, teses, normas ABNT, planejamento de pesquisas e documentos institucionais. Seja preciso, formal quando necessário. Use português brasileiro e Markdown para estruturar respostas.`,
  institutional:`Você é o Nexus IA, especialista em redação oficial brasileira. Gera ofícios, memorandos, declarações, atas e comunicados formais conforme o Manual de Redação da Presidência da República. Use linguagem formal, objetiva e clara. Use Markdown para estrutura.`,
  research:`Você é o Nexus IA, assistente de pesquisa científica. Auxilia com metodologia, estatística, revisão bibliográfica e redação de artigos. Baseie respostas em metodologias validadas. Use Markdown.`,
  technical:`Você é o Nexus IA em modo técnico, engenheiro de software sênior com 15+ anos de experiência em múltiplas linguagens e arquiteturas. Especialidades: TypeScript, Python, React, Node.js, SQL, design patterns, performance, segurança, clean code, SOLID, DRY. Ao responder: forneça código funcional e bem comentado, explique decisões técnicas, aponte armadilhas, sugira testes. Use Markdown com blocos de código linguagem-especificados.`,
  public:`Você é o Nexus IA especializado em Administração Pública Federal brasileira. Domina Lei 14.133/2021 (licitações), Decreto 12.785/2025, NBC TSP 07, SIPAC/SIAFI, gestão patrimonial, materiais, almoxarifado e normas da CGU/TCU. Seja preciso com fundamentação legal, cite dispositivos quando aplicável. Use Markdown.`,
  general:`Você é o Nexus IA, assistente generativo inteligente e versátil. Ajuda com análise, escrita, planejamento, código e muito mais. Responda em português brasileiro. Use Markdown.`,
};

function expandSlash(text) {
  const l = text.toLowerCase();
  // Acadêmico
  if(l.startsWith('/oficio')){const a=text.slice(7).trim();return`Gere um ofício institucional formal e completo${a?' sobre: '+a:' para solicitação de reunião/parceria'}. Inclua: cabeçalho com número e data, destinatário, assunto, fundamentação legal, desenvolvimento em seções numeradas, conclusão e fecho padrão ABNT.`;}
  if(l.startsWith('/resumo')){const a=text.slice(7).trim();return`Elabore um resumo acadêmico estruturado${a?' sobre: '+a:''}. Siga ABNT NBR 6028: objetivos, metodologia, resultados e conclusões. Inclua palavras-chave. 150-500 palavras.`;}
  if(l.startsWith('/revisar-codigo')){const c=text.slice(15).trim();return c?`Revise este código focando em: (1) Bugs e corretude lógica, (2) Simplicidade, DRY, clean code, (3) Conformidade com convenções e patterns. Para cada problema, indique severidade (alta/média/baixa), linha aproximada e solução proposta.\n\nCódigo:\n${c}`:`Pronto para revisar código. Cole o código em bloco \`\`\`linguagem para analisar.`;}
  if(l.startsWith('/revisar')){const c=text.slice(8).trim();return c?`Revise este texto acadêmico: erros gramaticais, inadequações ao registro formal, problemas com normas ABNT, coesão e coerência.\n\nTexto:\n${c}`:`Pronto para revisar um texto acadêmico. Cole o texto que deseja revisar.`;}
  if(l.startsWith('/metodologia')){const t=text.slice(12).trim();return`Sugira metodologia de pesquisa científica${t?' para: '+t:''}. Inclua: tipo, abordagem (qual/quant/mista), instrumentos, população, análise. Justifique cada escolha.`;}
  if(l.startsWith('/cronograma')){const i=text.slice(11).trim();return`Crie cronograma detalhado de pós-graduação${i?' com: '+i:' para mestrado de 24 meses'}. Fases: disciplinas, bibliográfica, coleta, qualificação, análise, redação, defesa.`;}
  if(l.startsWith('/banca')){const t=text.slice(6).trim();return`Simule 5 perguntas desafiadoras de banca de mestrado${t?' sobre: '+t:''}. Para cada uma: nível (baixo/médio/alto) e aspecto avaliado.`;}
  if(l.startsWith('/abnt')){const r=text.slice(5).trim();return r?`Formate segundo ABNT NBR 6023:2018: ${r}`:`Informe os dados da obra para formatar segundo ABNT NBR 6023:2018.`;}
  if(l.startsWith('/briefing')){const a=text.slice(9).trim();return`Gere briefing para reunião de orientação${a?' sobre: '+a:''}. Inclua: pauta, pontos de atenção, pendências, próximos passos, perguntas-guia.`;}
  // Técnico — inspirado no Claude Code feature-dev / code-explorer / code-architect / code-reviewer
  if(l.startsWith('/projeto')){const t=text.slice(8).trim();return`Vamos desenvolver uma feature seguindo workflow estruturado em 5 fases${t?' para: '+t:''}.\n\n**FASE 1 — Discovery:** Faça perguntas claras para entender o problema, constraints e requisitos. Liste-as numeradas.\n**FASE 2 — Exploração:** Identifique aspectos do código/sistema que preciso entender (arquivos, padrões, integrações existentes).\n**FASE 3 — Perguntas finais:** Liste o que ainda está ambíguo (edge cases, error handling, compatibilidade).\n**FASE 4 — Arquitetura:** Proponha 3 abordagens (minimal, clean, pragmática). Para cada: prós, contras, trade-offs. Recomende uma.\n**FASE 5 — Implementação + Revisão:** Código limpo seguindo a abordagem escolhida, com auto-revisão de bugs/DRY/conventions.\n\nComece pela Fase 1.`;}
  if(l.startsWith('/explorar')){const t=text.slice(9).trim();return`Analise em profundidade${t?': '+t:' o código/sistema fornecido'}. Entregue:\n1. **Entry points** com referências (arquivo:linha quando aplicável)\n2. **Fluxo de execução** passo a passo\n3. **Componentes e responsabilidades**\n4. **Camadas de arquitetura** e padrões identificados\n5. **Dependências e integrações**\n6. **Insights de arquitetura** — decisões de design aparentes\n7. **Arquivos essenciais** para compreender o sistema`;}
  if(l.startsWith('/arquitetura')){const t=text.slice(12).trim();return`Desenhe a arquitetura${t?' para: '+t:''} apresentando **3 abordagens distintas**:\n\n**1. Minimal Changes** — menor mudança, máximo reuso\n**2. Clean Architecture** — manutenibilidade, abstrações elegantes\n**3. Pragmatic Balance** — velocidade + qualidade\n\nPara cada abordagem:\n- Descrição da solução\n- Componentes e suas responsabilidades\n- Prós e contras\n- Trade-offs\n- Complexidade estimada\n\nFinalize com **recomendação fundamentada** da melhor abordagem para o contexto.`;}
  if(l.startsWith('/explicar')){const c=text.slice(9).trim();return c?`Explique este código trecho por trecho, em linguagem clara:\n- O que cada bloco faz\n- Por que foi escrito assim (decisões)\n- Armadilhas e pontos de atenção\n- Sugestões de melhoria\n\nCódigo:\n${c}`:`Cole o código que deseja entender.`;}
  if(l.startsWith('/testes')){const c=text.slice(7).trim();return c?`Gere testes unitários cobrindo: happy path, edge cases, error handling e casos limite. Use a convenção AAA (Arrange-Act-Assert) e nomes descritivos.\n\nCódigo a testar:\n${c}`:`Cole o código que precisa de testes.`;}
  if(l.startsWith('/commit')){const d=text.slice(7).trim();return`Gere mensagem de commit seguindo Conventional Commits (feat/fix/refactor/docs/test/chore) e uma descrição de PR completa${d?' para: '+d:''}. Estrutura do PR: O que mudou · Por que · Como testar · Breaking changes (se houver).`;}
  // Profissional
  if(l.startsWith('/relatorio')){const t=text.slice(10).trim();return`Elabore relatório técnico completo${t?' sobre: '+t:''}. Estrutura: Sumário Executivo, Contextualização, Metodologia, Análise/Dados, Resultados, Conclusões e Recomendações. Use tabelas e listas quando pertinente.`;}
  if(l.startsWith('/analise')){const t=text.slice(8).trim();return`Faça análise crítica estruturada${t?' de: '+t:''}. Estrutura: (1) Contexto, (2) Pontos fortes, (3) Pontos fracos, (4) Oportunidades, (5) Riscos, (6) Recomendações acionáveis. Seja objetivo e baseie-se em evidências.`;}
  if(l.startsWith('/plano')){const t=text.slice(6).trim();return`Crie plano de ação executável${t?' para: '+t:''}. Inclua: objetivo SMART, etapas numeradas com prazos, responsáveis sugeridos, recursos necessários, indicadores de sucesso (KPIs) e riscos/mitigação. Use tabela.`;}
  if(l.startsWith('/parecer')){const t=text.slice(8).trim();return`Emita parecer técnico fundamentado${t?' sobre: '+t:''}. Estrutura obrigatória: **I - Relatório** (fatos), **II - Análise Técnica** (com fundamentação legal/normativa), **III - Conclusão** (posicionamento claro) e **IV - Recomendação**. Cite dispositivos legais aplicáveis.`;}
  return text;
}

function toolsForSlash(text) {
  const l = text.toLowerCase();
  // Acadêmico
  if(l.startsWith('/oficio'))      return [{name:'DocumentGenerator', icon:'📄', args:'<b>type</b>=ofício · <b>format</b>=ABNT'}];
  if(l.startsWith('/revisar-codigo')) return [{name:'CodeReviewer',    icon:'🧹', args:'<b>checks</b>=bugs,DRY,conventions · <b>threshold</b>=80'}];
  if(l.startsWith('/revisar'))     return [{name:'AcademicReviewer',   icon:'🔍', args:'<b>standard</b>=ABNT · <b>lang</b>=pt-BR'}];
  if(l.startsWith('/resumo'))      return [{name:'SummaryGenerator',   icon:'📝', args:'<b>format</b>=NBR-6028 · <b>words</b>=150-500'}];
  if(l.startsWith('/metodologia')) return [{name:'MethodologyAdvisor', icon:'🔬', args:'<b>approach</b>=mixed · <b>rigor</b>=scientific'}];
  if(l.startsWith('/cronograma'))  return [{name:'SchedulePlanner',    icon:'📅', args:'<b>type</b>=post-grad · <b>format</b>=structured'}];
  if(l.startsWith('/banca'))       return [{name:'ExamSimulator',      icon:'🎓', args:'<b>questions</b>=5 · <b>difficulty</b>=varied'}];
  if(l.startsWith('/abnt'))        return [{name:'ABNTFormatter',      icon:'📚', args:'<b>norm</b>=NBR-6023:2018'}];
  if(l.startsWith('/briefing'))    return [{name:'BriefingGenerator',  icon:'📋', args:'<b>type</b>=orientation'}];
  // Técnico
  if(l.startsWith('/projeto'))     return [{name:'FeatureDevWorkflow', icon:'🏗', args:'<b>phases</b>=5 · <b>agents</b>=explorer,architect,reviewer'}];
  if(l.startsWith('/explorar'))    return [{name:'CodeExplorer',       icon:'🧭', args:'<b>depth</b>=full · <b>output</b>=entry-points,flow,deps'}];
  if(l.startsWith('/arquitetura')) return [{name:'CodeArchitect',      icon:'📐', args:'<b>approaches</b>=3 · <b>trade-offs</b>=true'}];
  if(l.startsWith('/explicar'))    return [{name:'CodeExplainer',      icon:'💡', args:'<b>depth</b>=line-by-line · <b>context</b>=full'}];
  if(l.startsWith('/testes'))      return [{name:'TestGenerator',      icon:'🧪', args:'<b>pattern</b>=AAA · <b>coverage</b>=edge+error'}];
  if(l.startsWith('/commit'))      return [{name:'GitCommitHelper',    icon:'💾', args:'<b>convention</b>=conventional-commits'}];
  // Profissional
  if(l.startsWith('/relatorio'))   return [{name:'ReportGenerator',    icon:'📊', args:'<b>structure</b>=executive · <b>format</b>=technical'}];
  if(l.startsWith('/analise'))     return [{name:'SWOTAnalyzer',       icon:'⚖️', args:'<b>framework</b>=SWOT+ · <b>depth</b>=critical'}];
  if(l.startsWith('/plano'))       return [{name:'ActionPlanner',      icon:'🎯', args:'<b>method</b>=SMART · <b>kpis</b>=included'}];
  if(l.startsWith('/parecer'))     return [{name:'TechnicalOpinion',   icon:'⚖', args:'<b>structure</b>=relatório-análise-conclusão'}];
  return [];
}

// ── Storage helpers ───────────────────────────────────────────────
function uid(){ return Math.random().toString(36).slice(2)+Date.now().toString(36); }
function fmtDate(ts){ return new Date(ts).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}); }
function fmtTime(ts){ return new Date(ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); }
function genTitle(t){ return t.length>50?t.slice(0,47)+'…':t; }
function escHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function simpleHash(s){ let h=0;for(let i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;}return 'h'+Math.abs(h).toString(36); }
function docType(txt,q){ const s=(q+' '+txt).toLowerCase(); if(/relatório|inventário|diagnóstico/.test(s))return'relatorio'; if(/ofício|rascunho|email|carta/.test(s))return'rascunho'; return'analise'; }
const TYPE_META={relatorio:{label:'Relatório',icon:'📄'},analise:{label:'Análise',icon:'📊'},rascunho:{label:'Rascunho',icon:'📝'}};
const ld=(k,fb)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):fb;}catch{return fb;}};
const sv=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};

function initUsers(){
  const ex=ld(K_USERS,null);
  if(ex&&ex.length>0)return ex;
  const a={id:uid(),username:'admin',name:'Administrador',email:'admin@nexusia.com',passwordHash:simpleHash('admin123'),role:'admin',createdAt:Date.now(),lastLogin:null,active:true};
  sv(K_USERS,[a]);return[a];
}

// ── Groq streaming ────────────────────────────────────────────────
async function callGroq(apiKey,model,msgs,sys,onChunk){
  const res=await fetch('https://api.groq.com/openai/v1/chat/completions',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`},
    body:JSON.stringify({model,stream:true,max_tokens:8192,temperature:0.7,
      messages:[{role:'system',content:sys},...msgs.map(m=>({role:m.role,content:m.content}))]
    }),
  });
  if(!res.ok){const err=await res.json().catch(()=>({}));throw new Error(err?.error?.message||`Erro ${res.status}`);}
  const reader=res.body.getReader(),dec=new TextDecoder();let full='';
  while(true){
    const {done,value}=await reader.read();if(done)break;
    for(const line of dec.decode(value).split('\n').filter(l=>l.startsWith('data: '))){
      const d=line.slice(6);if(d==='[DONE]')continue;
      try{const delta=JSON.parse(d).choices?.[0]?.delta?.content||'';full+=delta;onChunk(full);}catch{}
    }
  }
  return full;
}

// ── Markdown ──────────────────────────────────────────────────────
function Md({content}){
  const html=useMemo(()=>window.marked?window.marked.parse(content||''):(content||'').replace(/\n/g,'<br>'),[content]);
  return e('div',{className:'prose',dangerouslySetInnerHTML:{__html:html}});
}

// ── Design tokens as inline styles ───────────────────────────────
const T = {
  // Common button base
  btnPrimary:{padding:'11px 0',width:'100%',borderRadius:10,border:'none',cursor:'pointer',
    background:'linear-gradient(135deg,#c8a44a,#a8843a)',color:'#08090f',
    fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,letterSpacing:'0.3px',
    transition:'all 0.15s',boxShadow:'0 6px 24px rgba(200,164,74,0.2)'},
  btnGhost:{padding:'9px 0',width:'100%',borderRadius:9,border:'1px solid #1e2035',cursor:'pointer',
    background:'transparent',color:'#7a7d99',fontFamily:"'DM Sans',sans-serif",
    fontSize:12,fontWeight:500,transition:'all 0.15s'},
  input:{width:'100%',background:'#10111c',border:'1px solid #1e2035',borderRadius:9,
    padding:'11px 14px',color:'#e8e6e0',fontFamily:"'DM Sans',sans-serif",
    fontSize:13,outline:'none',transition:'border-color 0.15s'},
  label:{fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:600,color:'#7a7d99',
    display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'1px'},
  sectionCard:{marginBottom:22,padding:20,background:'#141520',border:'1px solid #1e2035',borderRadius:12},
  sectionTitle:{fontFamily:"'Cormorant Garamond',serif",fontSize:17,fontWeight:600,color:'#e8e6e0',marginBottom:14,display:'flex',alignItems:'center',gap:8},
};

// ============================================================
// LOGIN
// ============================================================
function LoginScreen({onLogin}){
  const [mode,setMode]=useState('login');
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [err,setErr]=useState('');
  const [loading,setLoading]=useState(false);

  const doLogin=async()=>{
    if(!username||!password){setErr('Preencha usuário e senha.');return;}
    setLoading(true);setErr('');
    await new Promise(r=>setTimeout(r,400));
    const users=ld(K_USERS,[]);
    const u=users.find(x=>x.username===username.trim().toLowerCase());
    if(!u||!u.active||u.passwordHash!==simpleHash(password)){setErr(!u?'Usuário não encontrado.':!u.active?'Conta desativada.':'Senha incorreta.');setLoading(false);return;}
    u.lastLogin=Date.now();sv(K_USERS,users.map(x=>x.id===u.id?u:x));sv(K_SESSION,{userId:u.id,loggedAt:Date.now()});onLogin(u);
  };

  const doRegister=async()=>{
    if(!username||!password||!name||!email){setErr('Preencha todos os campos.');return;}
    if(password.length<6){setErr('Senha deve ter ao menos 6 caracteres.');return;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){setErr('Email inválido.');return;}
    const users=ld(K_USERS,[]);
    if(users.some(x=>x.username===username.trim().toLowerCase())){setErr('Usuário já existe.');return;}
    setLoading(true);setErr('');await new Promise(r=>setTimeout(r,400));
    const nu={id:uid(),username:username.trim().toLowerCase(),name:name.trim(),email:email.trim().toLowerCase(),passwordHash:simpleHash(password),role:'user',createdAt:Date.now(),lastLogin:Date.now(),active:true};
    sv(K_USERS,[...users,nu]);sv(K_SESSION,{userId:nu.id,loggedAt:Date.now()});onLogin(nu);
  };

  const submit=mode==='login'?doLogin:doRegister;

  return e('div',{style:{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:24,position:'relative',overflow:'hidden'}},
    // Ambient
    e('div',{style:{position:'fixed',top:'10%',left:'50%',transform:'translateX(-50%)',width:700,height:700,borderRadius:'50%',background:'radial-gradient(circle,rgba(200,164,74,0.05) 0%,transparent 70%)',pointerEvents:'none'}}),
    e('div',{style:{position:'fixed',bottom:'-5%',right:0,width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(74,127,193,0.05) 0%,transparent 70%)',pointerEvents:'none'}}),

    e('div',{style:{width:'100%',maxWidth:420,background:'linear-gradient(160deg,#141520,#0f1020)',border:'1px solid #1e2035',borderRadius:18,padding:'42px 36px',boxShadow:'0 24px 64px rgba(0,0,0,0.55)',animation:'fadeUp 0.4s ease'}},

      // Brand header
      e('div',{style:{textAlign:'center',marginBottom:34}},
        e('div',{style:{fontFamily:"'Cormorant',serif",fontSize:36,fontWeight:800,color:'#c8a44a',letterSpacing:'-0.5px',lineHeight:1}},'Nexus IA'),
        e('div',{style:{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:'#7a7d99',marginTop:6,letterSpacing:'1.5px',textTransform:'uppercase'}},'Assistente Generativo Inteligente'),
        e('div',{style:{width:36,height:2,background:'linear-gradient(90deg,transparent,#c8a44a,transparent)',margin:'16px auto 0'}}),
      ),

      // Step indicator (style from OrientaMe activate screen)
      e('div',{style:{display:'flex',alignItems:'center',justifyContent:'center',gap:0,marginBottom:28}},
        ...[['1','Acesso',true],['2','Verificado',false]].map(([n,lbl,active],i)=>e(React.Fragment,{key:i},
          e('div',{style:{display:'flex',flexDirection:'column',alignItems:'center',gap:5}},
            e('div',{style:{width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,fontFamily:"'DM Sans',sans-serif",background:active?'#4a7fc1':'transparent',border:`2px solid ${active?'#4a7fc1':'#1e2035'}`,color:active?'#fff':'#3f4260',transition:'all 0.3s'}},n),
            e('span',{style:{fontSize:9,color:active?'#4a7fc1':'#3f4260',fontFamily:"'DM Sans',sans-serif",fontWeight:600,letterSpacing:'0.5px',textTransform:'uppercase'}},lbl),
          ),
          i===0&&e('div',{style:{width:60,height:1,background:'#1e2035',margin:'0 8px',marginBottom:20}}),
        )),
      ),

      // Tabs
      e('div',{style:{display:'flex',gap:3,padding:3,background:'#10111c',border:'1px solid #1e2035',borderRadius:9,marginBottom:22}},
        ['login','register'].map(m=>e('button',{key:m,onClick:()=>{setMode(m);setErr('');},style:{flex:1,padding:'8px',borderRadius:7,border:'none',cursor:'pointer',background:mode===m?'rgba(200,164,74,0.12)':'transparent',color:mode===m?'#c8a44a':'#7a7d99',fontSize:12,fontWeight:600,fontFamily:"'DM Sans',sans-serif",transition:'all 0.15s'}},{login:'Entrar',register:'Criar conta'}[m])),
      ),

      // Fields
      mode==='register'&&e('div',{style:{marginBottom:14}},e('label',{style:T.label},'Nome completo'),e('input',{value:name,onChange:ev=>setName(ev.target.value),placeholder:'Seu nome completo',style:T.input,onFocus:ev=>ev.target.style.borderColor='#4a7fc1',onBlur:ev=>ev.target.style.borderColor='#1e2035'})),
      mode==='register'&&e('div',{style:{marginBottom:14}},e('label',{style:T.label},'Email'),e('input',{type:'email',value:email,onChange:ev=>setEmail(ev.target.value),placeholder:'voce@instituicao.com',style:T.input,onFocus:ev=>ev.target.style.borderColor='#4a7fc1',onBlur:ev=>ev.target.style.borderColor='#1e2035'})),
      e('div',{style:{marginBottom:14}},e('label',{style:T.label},'Usuário'),e('input',{value:username,onChange:ev=>setUsername(ev.target.value),placeholder:'nome.usuario',autoFocus:true,onKeyDown:ev=>{if(ev.key==='Enter'&&mode==='login')submit();},style:T.input,onFocus:ev=>ev.target.style.borderColor='#4a7fc1',onBlur:ev=>ev.target.style.borderColor='#1e2035'})),
      e('div',{style:{marginBottom:18}},e('label',{style:T.label},'Senha'),e('input',{type:'password',value:password,onChange:ev=>setPassword(ev.target.value),placeholder:'••••••••',onKeyDown:ev=>{if(ev.key==='Enter')submit();},style:T.input,onFocus:ev=>ev.target.style.borderColor='#4a7fc1',onBlur:ev=>ev.target.style.borderColor='#1e2035'})),

      err&&e('div',{style:{marginBottom:14,padding:'9px 13px',background:'rgba(192,81,79,0.1)',border:'1px solid rgba(192,81,79,0.3)',borderRadius:8,fontFamily:"'DM Sans',sans-serif",fontSize:12,color:'#c0514f'}},'⚠ '+err),

      // Submit — styled like OrientaMe "Validar código" button
      e('button',{onClick:submit,disabled:loading,
        style:{...T.btnPrimary,opacity:loading?0.7:1,cursor:loading?'wait':'pointer'}},
        loading?'Processando…':(mode==='login'?'Entrar no Nexus IA →':'Criar minha conta →')),

      mode==='login'&&e('div',{style:{marginTop:18,padding:'11px 14px',background:'rgba(200,164,74,0.07)',border:'1px solid rgba(200,164,74,0.18)',borderRadius:9,fontFamily:"'DM Sans',sans-serif",fontSize:11,color:'#7a7d99',lineHeight:1.7}},
        e('strong',{style:{color:'#c8a44a'}},'Admin padrão: '),
        e('code',{style:{fontFamily:"'DM Mono',monospace",color:'#e2be6e',background:'rgba(0,0,0,0.3)',padding:'1px 6px',borderRadius:4}},'admin'),' / ',
        e('code',{style:{fontFamily:"'DM Mono',monospace",color:'#e2be6e',background:'rgba(0,0,0,0.3)',padding:'1px 6px',borderRadius:4}},'admin123'),
        e('div',{style:{marginTop:5,fontSize:10,color:'#3f4260'}},'Troque a senha após o primeiro acesso.'),
      ),

      e('div',{style:{marginTop:24,textAlign:'center',fontFamily:"'DM Sans',sans-serif",fontSize:10,color:'#3f4260',letterSpacing:'0.5px'}},'Nexus IA · Gestão acadêmica com IA'),
    )
  );
}

// ── Avatar ────────────────────────────────────────────────────────
function Avatar({role,user}){
  if(role==='user'&&user){
    const init=(user.name||user.username||'U').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
    return e('div',{style:{width:30,height:30,borderRadius:8,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,fontFamily:"'DM Sans',sans-serif",background:'linear-gradient(135deg,#2d5fa0,#1a3a6a)',color:'#fff',letterSpacing:'0.5px'}},init);
  }
  return e('div',{style:{width:30,height:30,borderRadius:8,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Cormorant Garamond',serif",fontSize:15,fontWeight:600,background:'linear-gradient(135deg,#c8a44a,#8a6420)',color:'#08090f'}},'N');
}

// ── Tool Block ────────────────────────────────────────────────────
function ToolBlock({tool,done}){
  return e('div',{style:{background:'rgba(0,0,0,0.25)',border:`1px solid ${done?'rgba(61,158,114,0.35)':'rgba(74,127,193,0.3)'}`,borderLeft:`2px solid ${done?'#3d9e72':'#4a7fc1'}`,borderRadius:8,padding:'9px 13px',margin:'7px 0',fontFamily:"'DM Mono',monospace",fontSize:11}},
    e('div',{style:{display:'flex',alignItems:'center',gap:7,marginBottom:done&&tool.args?5:0}},
      e('span',null,tool.icon||'⚙'),
      e('span',{style:{color:done?'#3d9e72':'#6b9fd6',fontWeight:500}},tool.name),
      e('span',{style:{marginLeft:'auto',fontSize:9,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.8px',color:done?'#3d9e72':'#3f4260'}},done?'✓ concluído':'processando…'),
    ),
    tool.args&&e('div',{style:{color:'#7a7d99',fontSize:10,lineHeight:1.6},dangerouslySetInnerHTML:{__html:tool.args.replace(/<b>/g,'<b style="color:#c8a44a">'),}}),
  );
}

// ── Message ───────────────────────────────────────────────────────
function Message({msg,user}){
  const isAI=msg.role==='assistant';
  const ts=fmtTime(msg.timestamp||Date.now());
  return e('div',{style:{display:'flex',gap:10,marginBottom:22,flexDirection:isAI?'row':'row-reverse',animation:'fadeUp 0.25s ease',maxWidth:880,width:'100%',margin:'0 auto 22px'}},
    e(Avatar,{role:isAI?'ai':'user',user}),
    e('div',{style:{maxWidth:'80%',minWidth:0}},
      e('div',{style:{display:'flex',alignItems:'center',gap:8,marginBottom:5,flexDirection:isAI?'row':'row-reverse'}},
        e('span',{style:{fontSize:11,fontWeight:600,color:isAI?'#c8a44a':'#4a7fc1',fontFamily:"'DM Sans',sans-serif"}},(isAI?'Nexus IA':user?.name||'Você')),
        e('span',{style:{fontSize:10,color:'#3f4260',fontFamily:"'DM Sans',sans-serif"}},ts),
      ),
      msg.tools&&msg.tools.map((t,i)=>e(ToolBlock,{key:i,tool:t,done:!!msg.toolsDone})),
      e('div',{style:{background:isAI?'#10111c':'rgba(74,127,193,0.08)',border:`1px solid ${isAI?'#1e2035':'rgba(74,127,193,0.2)'}`,borderRadius:isAI?'3px 12px 12px 12px':'12px 3px 12px 12px',padding:'11px 15px'}},
        isAI?e(Md,{content:msg.content||''}):e('div',{style:{fontSize:14,lineHeight:1.7,color:'#e8e6e0',fontFamily:"'DM Sans',sans-serif",wordBreak:'break-word'}},msg.content),
      ),
      msg.savedDoc&&e('div',{style:{marginTop:5,display:'flex',alignItems:'center',gap:6,padding:'4px 10px',background:'rgba(61,158,114,0.08)',border:'1px solid rgba(61,158,114,0.25)',borderRadius:7}},
        e('span',{style:{fontSize:10,color:'#3d9e72',fontWeight:600,fontFamily:"'DM Sans',sans-serif"}},'▪ Salvo no Arquivo · '+msg.savedDoc.name),
      ),
    )
  );
}

// ── Typing ────────────────────────────────────────────────────────
function Typing(){
  return e('div',{style:{display:'flex',gap:10,marginBottom:22,maxWidth:880,width:'100%',margin:'0 auto 22px'}},
    e(Avatar,{role:'ai'}),
    e('div',{style:{padding:'12px 16px',background:'#10111c',border:'1px solid #1e2035',borderRadius:'3px 12px 12px 12px',display:'flex',alignItems:'center',gap:5}},
      [0,0.18,0.36].map((d,i)=>e('div',{key:i,style:{width:5,height:5,borderRadius:'50%',background:'#c8a44a',animation:`bounceDot 1.2s ease-in-out ${d}s infinite`}})),
    )
  );
}

// ── Nav Item ──────────────────────────────────────────────────────
function NavItem({icon,label,active,onClick,badge}){
  const [hov,setHov]=useState(false);
  return e('div',{onClick,onMouseEnter:()=>setHov(true),onMouseLeave:()=>setHov(false),
    style:{display:'flex',alignItems:'center',gap:9,padding:'8px 10px',borderRadius:7,cursor:'pointer',marginBottom:1,
      background:active?'rgba(200,164,74,0.09)':hov?'rgba(255,255,255,0.03)':'transparent',
      border:`1px solid ${active?'rgba(200,164,74,0.2)':'transparent'}`,
      color:active?'#c8a44a':hov?'#e8e6e0':'#7a7d99',
      fontSize:12,fontWeight:500,transition:'all 0.12s',fontFamily:"'DM Sans',sans-serif"}},
    e('span',{style:{fontSize:13,width:16,textAlign:'center',flexShrink:0}},icon),
    e('span',{style:{flex:1}},label),
    badge&&e('span',{style:{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:99,background:'rgba(200,164,74,0.12)',color:'#c8a44a'}},badge),
  );
}

// ── Sidebar ───────────────────────────────────────────────────────
function Sidebar({user,convs,activeId,onSelect,onNew,onDelete,view,onView,onLogout,userCount}){
  const isAdmin=user.role==='admin';
  return e('div',{style:{width:245,minWidth:245,background:'#10111c',borderRight:'1px solid #1e2035',display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden'}},
    // Brand
    e('div',{style:{padding:'18px 16px 14px',borderBottom:'1px solid #1e2035'}},
      e('div',{style:{fontFamily:"'Cormorant',serif",fontSize:22,fontWeight:800,color:'#c8a44a',letterSpacing:'-0.3px',lineHeight:1.1}},'Nexus IA'),
      e('div',{style:{fontFamily:"'DM Sans',sans-serif",fontSize:9,color:'#3f4260',letterSpacing:'1.5px',textTransform:'uppercase',marginTop:3}},'Assistente Generativo'),
    ),
    // User info
    e('div',{style:{padding:'10px 14px',borderBottom:'1px solid #1e2035',display:'flex',alignItems:'center',gap:9}},
      e(Avatar,{role:'user',user}),
      e('div',{style:{minWidth:0,flex:1}},
        e('div',{style:{fontSize:12,fontWeight:600,color:'#e8e6e0',fontFamily:"'DM Sans',sans-serif",overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},user.name),
        e('div',{style:{fontSize:10,color:isAdmin?'#c8a44a':'#7a7d99',fontFamily:"'DM Sans',sans-serif",fontWeight:isAdmin?600:400}},isAdmin?'👑 Administrador':user.username),
      ),
    ),
    // Nav
    e('div',{style:{padding:'10px 8px 4px'}},
      e('div',{style:{fontSize:9,fontWeight:700,color:'#3f4260',letterSpacing:'1.5px',textTransform:'uppercase',padding:'0 8px 6px',fontFamily:"'DM Sans',sans-serif"}},'Principal'),
      e(NavItem,{icon:'💬',label:'Chat',active:view==='chat',onClick:()=>onView('chat')}),
      e(NavItem,{icon:'▪',label:'Arquivo de Docs',active:view==='arquivo',onClick:()=>onView('arquivo')}),
      e(NavItem,{icon:'⚙',label:'Configurações',active:view==='settings',onClick:()=>onView('settings')}),
      isAdmin&&e(NavItem,{icon:'👥',label:'Usuários',active:view==='admin',onClick:()=>onView('admin'),badge:userCount}),
    ),
    // New conv button
    e('div',{style:{padding:'0 8px 8px'}},
      e('button',{onClick:onNew,style:{width:'100%',padding:'9px',borderRadius:7,cursor:'pointer',background:'rgba(200,164,74,0.08)',border:'1px solid rgba(200,164,74,0.22)',color:'#c8a44a',fontSize:12,fontWeight:600,fontFamily:"'DM Sans',sans-serif",transition:'all 0.15s'},
        onMouseEnter:ev=>{ev.currentTarget.style.background='linear-gradient(135deg,#c8a44a,#a8843a)';ev.currentTarget.style.color='#08090f';ev.currentTarget.style.borderColor='transparent';},
        onMouseLeave:ev=>{ev.currentTarget.style.background='rgba(200,164,74,0.08)';ev.currentTarget.style.color='#c8a44a';ev.currentTarget.style.borderColor='rgba(200,164,74,0.22)';},
      },'+ Nova conversa'),
    ),
    // Conv list
    e('div',{style:{fontSize:9,fontWeight:700,color:'#3f4260',letterSpacing:'1.5px',textTransform:'uppercase',padding:'4px 16px 5px',fontFamily:"'DM Sans',sans-serif"}},'Conversas'),
    e('div',{style:{flex:1,overflowY:'auto',padding:'0 8px'}},
      convs.length===0?e('div',{style:{padding:'20px 10px',textAlign:'center',fontSize:11,color:'#3f4260',fontFamily:"'DM Sans',sans-serif"}},'Nenhuma conversa ainda'):
      convs.map(c=>e('div',{key:c.id,onClick:()=>{onSelect(c.id);onView('chat');},
        style:{display:'flex',alignItems:'center',gap:6,padding:'7px 10px',borderRadius:7,cursor:'pointer',marginBottom:1,
          background:c.id===activeId?'rgba(200,164,74,0.08)':'transparent',
          border:`1px solid ${c.id===activeId?'rgba(200,164,74,0.18)':'transparent'}`,transition:'all 0.12s'},
        onMouseEnter:ev=>{if(c.id!==activeId)ev.currentTarget.style.background='rgba(255,255,255,0.025)';},
        onMouseLeave:ev=>{if(c.id!==activeId)ev.currentTarget.style.background='transparent';},
      },
        e('div',{style:{flex:1,minWidth:0,fontSize:11,fontWeight:c.id===activeId?600:400,color:c.id===activeId?'#c8a44a':'#7a7d99',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:"'DM Sans',sans-serif"}},c.title),
        e('button',{onClick:ev=>{ev.stopPropagation();onDelete(c.id);},style:{background:'none',border:'none',color:'#3f4260',cursor:'pointer',fontSize:13,padding:'0 2px',lineHeight:1,flexShrink:0}},'×'),
      ))
    ),
    // Footer
    e('div',{style:{padding:'10px 8px 14px',borderTop:'1px solid #1e2035',display:'flex',flexDirection:'column',gap:5}},
      e('div',{style:{display:'flex',alignItems:'center',gap:7,padding:'6px 10px',borderRadius:7,background:'rgba(0,0,0,0.2)',border:'1px solid #1e2035'}},
        e('div',{style:{width:5,height:5,borderRadius:'50%',background:'#3d9e72',boxShadow:'0 0 6px rgba(61,158,114,0.7)',flexShrink:0,animation:'pulse 2s ease infinite'}}),
        e('span',{style:{fontSize:10,fontWeight:600,color:'#e8e6e0',fontFamily:"'DM Sans',sans-serif"}},'Groq · Online'),
      ),
      e('button',{onClick:onLogout,style:{width:'100%',padding:'7px',borderRadius:7,cursor:'pointer',background:'transparent',border:'1px solid #1e2035',color:'#7a7d99',fontSize:11,fontFamily:"'DM Sans',sans-serif",transition:'all 0.12s',fontWeight:500},
        onMouseEnter:ev=>{ev.currentTarget.style.borderColor='#c0514f';ev.currentTarget.style.color='#c0514f';},
        onMouseLeave:ev=>{ev.currentTarget.style.borderColor='#1e2035';ev.currentTarget.style.color='#7a7d99';},
      },'↩ Sair'),
    )
  );
}

// ── Welcome ───────────────────────────────────────────────────────
function Welcome({user,onSuggest,mode}){
  const SUGS={
    academic:[
      '🎓 Elabore um resumo de dissertação em PLN',
      '📅 Crie um cronograma de mestrado para 24 meses',
      '🔬 Sugira metodologia para pesquisa em IA aplicada',
      '📚 Formate esta referência segundo ABNT NBR 6023',
      '🧐 Revisar texto acadêmico com normas ABNT',
      '🎯 Simular banca examinadora de mestrado',
    ],
    institutional:[
      '📝 Gere um ofício institucional para parceria com a UFPB',
      '📋 Briefing para reunião de orientação acadêmica',
      '⚖ Parecer técnico sobre aquisição de equipamentos',
      '📄 Memorando circular para servidores do setor',
      '🏛 Ata de reunião de colegiado',
      '✉ Email formal de resposta a solicitação',
    ],
    research:[
      '🔬 Esboce metodologia para estudo quantitativo',
      '📊 Análise estatística: qual teste usar para dados pareados?',
      '📑 Estrutura de artigo para revista Qualis A1',
      '🧪 Desenho experimental para validar hipótese',
      '📚 Revisão sistemática: protocolo PRISMA',
      '🎯 Formulação de hipóteses e perguntas de pesquisa',
    ],
    technical:[
      '🏗 Inicie um projeto seguindo workflow estruturado',
      '🧭 Explore a arquitetura de um sistema Next.js',
      '📐 Projete 3 abordagens para uma feature de cache',
      '🧹 Revise este código: bugs, DRY e convenções',
      '🧪 Gere testes unitários com AAA pattern',
      '💾 Mensagem de commit + PR description',
    ],
    public:[
      '⚖️ Análise de conformidade com Lei 14.133/2021',
      '📊 Relatório de inventário patrimonial anual',
      '🎯 Plano de ação para recolhimento de bens inservíveis',
      '📄 Parecer sobre dispensa de licitação',
      '📋 Briefing sobre Decreto 12.785/2025',
      '🏛 Procedimento para movimentação de bens',
    ],
    general:[
      '📝 Gere um ofício institucional para parceria',
      '🎓 Elabore um resumo de dissertação',
      '💻 Ajude a projetar uma feature de autenticação',
      '📊 Relatório técnico estruturado',
      '🎯 Plano de ação com prazos e KPIs',
      '⚖ Análise crítica com recomendações',
    ],
  };
  const sugs=SUGS[mode]||SUGS.general;
  const MODE_TITLE={academic:'Modo Acadêmico',institutional:'Modo Institucional',research:'Modo Pesquisa',technical:'Modo Técnico',public:'Modo Pública',general:'Modo Geral'};
  return e('div',{style:{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'65vh',textAlign:'center',padding:'2rem',animation:'fadeIn 0.4s ease'}},
    e('div',{style:{fontFamily:"'Cormorant',serif",fontSize:52,fontWeight:800,color:'#c8a44a',letterSpacing:'-1px',lineHeight:1,marginBottom:10,animation:'float 4s ease infinite'}},'Nexus IA'),
    e('p',{style:{color:'#7a7d99',fontSize:14,marginBottom:4,fontFamily:"'DM Sans',sans-serif"}},`Olá, ${(user.name||'').split(' ')[0]} — o que você precisa hoje?`),
    e('div',{style:{display:'inline-flex',alignItems:'center',gap:6,padding:'3px 12px',borderRadius:99,background:'rgba(200,164,74,0.09)',border:'1px solid rgba(200,164,74,0.22)',marginBottom:20}},
      e('span',{style:{width:5,height:5,borderRadius:'50%',background:'#c8a44a'}}),
      e('span',{style:{fontSize:10,color:'#c8a44a',fontFamily:"'DM Sans',sans-serif",fontWeight:600,letterSpacing:'0.5px',textTransform:'uppercase'}},MODE_TITLE[mode]||'Geral'),
    ),
    e('p',{style:{color:'#3f4260',fontSize:11,marginBottom:32,fontFamily:"'DM Sans',sans-serif",letterSpacing:'0.5px'}},'Digite / para ver os comandos disponíveis'),
    e('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(215px,1fr))',gap:9,width:'100%',maxWidth:700}},
      sugs.map((t,i)=>e('div',{key:i,onClick:()=>onSuggest(t),style:{padding:'13px 15px',borderRadius:10,border:'1px solid #1e2035',background:'#141520',color:'#7a7d99',fontSize:12,textAlign:'left',lineHeight:1.55,fontFamily:"'DM Sans',sans-serif",cursor:'pointer',transition:'all 0.15s'},
        onMouseEnter:ev=>{ev.currentTarget.style.borderColor='rgba(200,164,74,0.35)';ev.currentTarget.style.color='#e8e6e0';ev.currentTarget.style.background='rgba(200,164,74,0.06)';},
        onMouseLeave:ev=>{ev.currentTarget.style.borderColor='#1e2035';ev.currentTarget.style.color='#7a7d99';ev.currentTarget.style.background='#141520';},
      },t))
    )
  );
}

// ── Chat View ─────────────────────────────────────────────────────
function ChatView({user,conv,cfg,onSend,loading,onClear}){
  const [input,setInput]=useState('');
  const [slashOpen,setSlashOpen]=useState(false);
  const [slashFiltered,setSlashFiltered]=useState([]);
  const [slashIdx,setSlashIdx]=useState(0);
  const bottomRef=useRef(null);const textRef=useRef(null);

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'});},[conv?.messages?.length,loading]);

  const send=(txt)=>{
    const t=(txt||input).trim();if(!t||loading)return;
    setInput('');if(textRef.current)textRef.current.style.height='auto';
    setSlashOpen(false);onSend(t);
  };

  const handleInput=ev=>{
    const val=ev.target.value;setInput(val);
    ev.target.style.height='auto';ev.target.style.height=Math.min(ev.target.scrollHeight,180)+'px';
    if(val.startsWith('/')){const f=SLASH_COMMANDS.filter(c=>c.cmd.startsWith(val.toLowerCase()));if(f.length){setSlashFiltered(f);setSlashOpen(true);setSlashIdx(0);return;}}
    setSlashOpen(false);
  };

  const handleKey=ev=>{
    if(slashOpen){
      if(ev.key==='ArrowDown'){ev.preventDefault();setSlashIdx(i=>Math.min(i+1,slashFiltered.length-1));return;}
      if(ev.key==='ArrowUp'){ev.preventDefault();setSlashIdx(i=>Math.max(i-1,0));return;}
      if(ev.key==='Tab'||ev.key==='Enter'){ev.preventDefault();selSlash(slashFiltered[slashIdx].cmd);return;}
      if(ev.key==='Escape'){setSlashOpen(false);return;}
    }
    if(ev.key==='Enter'&&!ev.shiftKey){ev.preventDefault();send();}
  };

  const selSlash=cmd=>{setInput(cmd+' ');setSlashOpen(false);textRef.current?.focus();};
  const modelInfo=MODELS.find(m=>m.id===cfg.model);
  const hasKey=!!cfg.apiKey;
  const estTokens=Math.round((conv?.messages||[]).reduce((s,m)=>s+(m.content||'').length,0)/4);

  return e('div',{style:{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',height:'100vh'}},
    // Topbar
    e('div',{style:{height:50,flexShrink:0,background:'rgba(16,17,28,0.98)',borderBottom:'1px solid #1e2035',display:'flex',alignItems:'center',padding:'0 20px',gap:12,backdropFilter:'blur(8px)'}},
      e('div',{style:{flex:1,fontSize:13,fontWeight:600,color:'#e8e6e0',fontFamily:"'DM Sans',sans-serif",overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},conv?.title||'Nova conversa'),
      modelInfo&&e('div',{style:{fontFamily:"'DM Mono',monospace",fontSize:10,color:'#3f4260',background:'#141520',border:'1px solid #1e2035',borderRadius:5,padding:'3px 8px',flexShrink:0}},modelInfo.label.split('—')[0].trim()),
      e('button',{onClick:onClear,style:{background:'none',border:'1px solid #1e2035',color:'#7a7d99',borderRadius:6,padding:'4px 10px',fontSize:11,cursor:'pointer',transition:'all 0.15s',fontFamily:"'DM Sans',sans-serif"},onMouseEnter:ev=>{ev.currentTarget.style.borderColor='#2d304f';ev.currentTarget.style.color='#e8e6e0';},onMouseLeave:ev=>{ev.currentTarget.style.borderColor='#1e2035';ev.currentTarget.style.color='#7a7d99';}},'🗑 Limpar'),
    ),
    // Context bar
    e('div',{style:{padding:'5px 20px',borderBottom:'1px solid #1e2035',background:'rgba(20,21,32,0.6)',display:'flex',alignItems:'center',gap:7,fontSize:10,color:'#7a7d99',overflowX:'auto',flexShrink:0,fontFamily:"'DM Mono',monospace"}},
      e('span',{style:{color:'#3f4260'}},'ctx'),
      ...[`~${estTokens}t`,cfg.mode||'general','groq'].map((t,i)=>e('span',{key:i,style:{background:'#141520',border:`1px solid ${i===2?'rgba(61,158,114,0.25)':i===1?'rgba(200,164,74,0.2)':'#1e2035'}`,borderRadius:4,padding:'1px 7px',color:i===2?'#3d9e72':i===1?'#c8a44a':'#7a7d99',whiteSpace:'nowrap'}},t)),
    ),
    // Messages
    e('div',{style:{flex:1,overflowY:'auto',padding:'20px 20px'}},
      !conv||conv.messages.length===0?e(Welcome,{user,onSuggest:t=>send(t),mode:cfg.mode||'general'}):
        e(React.Fragment,null,
          ...conv.messages.map(m=>e(Message,{key:m.id,msg:m,user})),
          loading?e(Typing,null):null,
        ),
      e('div',{ref:bottomRef}),
    ),
    // Input
    e('div',{style:{flexShrink:0,borderTop:'1px solid #1e2035',background:'rgba(16,17,28,0.98)',padding:'12px 20px 14px',backdropFilter:'blur(8px)'}},
      e('div',{style:{maxWidth:880,margin:'0 auto'}},
        !hasKey&&e('div',{style:{marginBottom:10,padding:'8px 13px',background:'rgba(200,164,74,0.07)',border:'1px solid rgba(200,164,74,0.2)',borderRadius:8,fontSize:12,color:'#c8a44a',fontFamily:"'DM Sans',sans-serif"}},'⚠ Configure sua Groq API Key em Configurações para começar'),
        // Slash menu
        slashOpen&&e('div',{style:{background:'#10111c',border:'1px solid #1e2035',borderRadius:9,padding:5,marginBottom:7,boxShadow:'0 8px 24px rgba(0,0,0,0.5)',maxHeight:280,overflowY:'auto'}},
          (()=>{
            // Agrupa por categoria
            const byCat={};
            slashFiltered.forEach((c,i)=>{const k=c.cat||'outros';(byCat[k]=byCat[k]||[]).push({...c,__idx:i});});
            const order=['sistema','acadêmico','técnico','profissional','outros'];
            const catLabels={sistema:'Sistema',acadêmico:'Acadêmico',técnico:'Técnico / Código',profissional:'Profissional',outros:'Outros'};
            const out=[];
            order.forEach(k=>{
              if(!byCat[k]) return;
              out.push(e('div',{key:'h_'+k,style:{fontSize:8,fontWeight:700,color:'#3f4260',letterSpacing:'1.5px',textTransform:'uppercase',padding:'6px 10px 3px',fontFamily:"'DM Sans',sans-serif"}},catLabels[k]));
              byCat[k].forEach(c=>out.push(
                e('div',{key:c.cmd,onClick:()=>selSlash(c.cmd),
                  style:{padding:'7px 12px',borderRadius:7,display:'flex',alignItems:'center',gap:10,cursor:'pointer',background:c.__idx===slashIdx?'rgba(200,164,74,0.08)':'transparent',transition:'background 0.1s'},
                  onMouseEnter:()=>setSlashIdx(c.__idx)},
                  e('span',{style:{fontSize:13}},c.icon),
                  e('span',{style:{fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:500,color:'#c8a44a',minWidth:145}},c.cmd),
                  e('span',{style:{fontSize:11,color:'#7a7d99',fontFamily:"'DM Sans',sans-serif"}},c.desc),
                )
              ));
            });
            return out;
          })()
        ),
        // Input row
        e('div',{style:{display:'flex',gap:8,alignItems:'flex-end'}},
          e('div',{style:{flex:1,background:'#141520',border:'1px solid #1e2035',borderRadius:11,display:'flex',flexDirection:'column',overflow:'hidden',transition:'border-color 0.15s'},
            onFocusCapture:ev=>ev.currentTarget.style.borderColor='rgba(74,127,193,0.5)',
            onBlurCapture:ev=>ev.currentTarget.style.borderColor='#1e2035'},
            e('textarea',{ref:textRef,value:input,onChange:handleInput,onKeyDown:handleKey,
              placeholder:hasKey?'Mensagem… (/ para comandos, Enter para enviar)':'Configure sua API Key primeiro…',
              disabled:!hasKey||loading,rows:1,
              style:{width:'100%',background:'transparent',border:'none',outline:'none',color:'#e8e6e0',fontSize:14,lineHeight:1.65,resize:'none',padding:'10px 13px',maxHeight:180,fontFamily:"'DM Sans',sans-serif"},
            }),
            e('div',{style:{padding:'3px 12px 7px',display:'flex',alignItems:'center',gap:6}},
              e('span',{style:{fontSize:10,color:'#3f4260',fontFamily:"'DM Sans',sans-serif"}},
                e('kbd',{style:{background:'#1e2035',border:'1px solid #2d304f',borderRadius:3,padding:'1px 5px',fontSize:9,fontFamily:"'DM Mono',monospace"}},'Enter'),' enviar · ',
                e('kbd',{style:{background:'#1e2035',border:'1px solid #2d304f',borderRadius:3,padding:'1px 5px',fontSize:9,fontFamily:"'DM Mono',monospace"}},'Shift+Enter'),' nova linha',
              ),
              e('span',{style:{marginLeft:'auto',fontSize:10,color:'#3f4260',fontFamily:"'DM Mono',monospace"}},input.length),
            ),
          ),
          e('button',{onClick:()=>send(),disabled:!hasKey||loading||!input.trim(),
            style:{width:40,height:40,flexShrink:0,borderRadius:9,border:'none',
              cursor:(hasKey&&!loading&&input.trim())?'pointer':'not-allowed',
              background:(hasKey&&!loading&&input.trim())?'linear-gradient(135deg,#c8a44a,#8a6420)':'#1e2035',
              color:(hasKey&&!loading&&input.trim())?'#08090f':'#3f4260',
              fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s',
              boxShadow:(hasKey&&!loading&&input.trim())?'0 4px 14px rgba(200,164,74,0.22)':'none'},
          },loading?e('span',{style:{width:13,height:13,border:'2px solid rgba(0,0,0,0.2)',borderTopColor:'#08090f',borderRadius:'50%',display:'inline-block',animation:'spin 0.7s linear infinite'}}):'↑'),
        ),
      )
    )
  );
}

// ── Arquivo de Docs ───────────────────────────────────────────────
function ArquivoView({docs,onDelete,onDownload}){
  const [filter,setFilter]=useState('todos');
  const [query,setQuery]=useState('');
  const filtered=docs.filter(d=>{
    const mt=filter==='todos'||d.type===filter;
    return mt&&(!query||d.name.toLowerCase().includes(query.toLowerCase()));
  });
  const filters=[['todos','Todos'],['relatorio','Relatórios'],['analise','Análises'],['rascunho','Rascunhos']];
  return e('div',{style:{flex:1,overflowY:'auto',padding:24}},
    e('div',{style:{marginBottom:22}},
      e('div',{style:{fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:600,color:'#e8e6e0',marginBottom:4}},'Arquivo de Documentos'),
      e('div',{style:{fontSize:12,color:'#7a7d99',fontFamily:"'DM Sans',sans-serif"}},`${docs.length} documento${docs.length!==1?'s':''} · Respostas longas são salvas automaticamente`),
    ),
    e('div',{style:{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}},
      e('input',{value:query,onChange:ev=>setQuery(ev.target.value),placeholder:'Buscar…',style:{flex:1,minWidth:180,...T.input,padding:'8px 13px',fontSize:12}}),
      filters.map(([f,l])=>e('button',{key:f,onClick:()=>setFilter(f),style:{padding:'6px 14px',borderRadius:7,cursor:'pointer',border:`1px solid ${filter===f?'rgba(200,164,74,0.4)':'#1e2035'}`,background:filter===f?'rgba(200,164,74,0.09)':'#141520',color:filter===f?'#c8a44a':'#7a7d99',fontSize:11,fontWeight:600,fontFamily:"'DM Sans',sans-serif",transition:'all 0.15s'}},l)),
    ),
    filtered.length===0?e('div',{style:{textAlign:'center',padding:'60px 0',color:'#7a7d99',fontFamily:"'DM Sans',sans-serif"}},
      e('div',{style:{fontFamily:"'Cormorant Garamond',serif",fontSize:32,color:'#3f4260',marginBottom:12}},'Nenhum documento'),
      e('div',{style:{fontSize:12,lineHeight:1.7,maxWidth:320,margin:'0 auto'}},'Respostas da IA com mais de 400 caracteres são salvas automaticamente aqui.'),
    ):e('div',{style:{background:'#141520',border:'1px solid #1e2035',borderRadius:12,overflow:'hidden'}},
      e('div',{style:{display:'grid',gridTemplateColumns:'2fr 1fr 80px 90px 70px',padding:'9px 18px',borderBottom:'1px solid #1e2035',background:'rgba(0,0,0,0.15)',fontSize:9,fontWeight:700,color:'#3f4260',textTransform:'uppercase',letterSpacing:'1px',fontFamily:"'DM Sans',sans-serif"}},
        e('span',null,'Nome'),e('span',null,'Data'),e('span',null,'Hora'),e('span',null,'Tipo'),e('span',null,''),
      ),
      filtered.map((d,i)=>{const m=TYPE_META[d.type]||TYPE_META.analise;
        return e('div',{key:d.id,style:{display:'grid',gridTemplateColumns:'2fr 1fr 80px 90px 70px',alignItems:'center',padding:'11px 18px',borderBottom:i<filtered.length-1?'1px solid #1e2035':'none',transition:'background 0.12s'},
          onMouseEnter:ev=>ev.currentTarget.style.background='rgba(200,164,74,0.03)',
          onMouseLeave:ev=>ev.currentTarget.style.background='transparent'},
          e('div',{style:{display:'flex',alignItems:'center',gap:9,minWidth:0}},
            e('span',{style:{fontSize:14,flexShrink:0}},m.icon),
            e('span',{style:{fontSize:12,fontWeight:500,color:'#e8e6e0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:"'DM Sans',sans-serif"}},d.name),
          ),
          e('span',{style:{fontSize:11,color:'#7a7d99',fontFamily:"'DM Sans',sans-serif"}},fmtDate(d.createdAt)),
          e('span',{style:{fontFamily:"'Cormorant Garamond',serif",fontSize:14,fontWeight:600,color:'#e8e6e0'}},fmtTime(d.createdAt)),
          e('span',{style:{fontSize:10,fontWeight:600,fontFamily:"'DM Sans',sans-serif",padding:'2px 8px',borderRadius:5,background:'rgba(200,164,74,0.08)',color:'#c8a44a',display:'inline-block'}},m.label),
          e('div',{style:{display:'flex',gap:4}},
            e('button',{onClick:()=>onDownload(d),style:{background:'none',border:'none',color:'#7a7d99',cursor:'pointer',fontSize:14,padding:'3px 6px',borderRadius:5,transition:'all 0.12s'},onMouseEnter:ev=>{ev.currentTarget.style.color='#c8a44a';},onMouseLeave:ev=>{ev.currentTarget.style.color='#7a7d99';}},'⬇'),
            e('button',{onClick:()=>{if(confirm(`Excluir "${d.name}"?`))onDelete(d.id);},style:{background:'none',border:'none',color:'#7a7d99',cursor:'pointer',fontSize:14,padding:'3px 6px',borderRadius:5,transition:'all 0.12s'},onMouseEnter:ev=>{ev.currentTarget.style.color='#c0514f';},onMouseLeave:ev=>{ev.currentTarget.style.color='#7a7d99';}},'🗑'),
          ),
        );
      })
    )
  );
}

// ── Settings View ─────────────────────────────────────────────────
function SettingsView({user,cfg,onSave,onUpdateUser}){
  const [apiKey,setApiKey]=useState(cfg.apiKey||'');
  const [model,setModel]=useState(cfg.model||DEFAULT_MODEL);
  const [mode,setMode]=useState(cfg.mode||'academic');
  const [sys,setSys]=useState(cfg.systemPrompt||'');
  const [name,setName]=useState(user.name);
  const [email,setEmail]=useState(user.email);
  const [oldPass,setOldPass]=useState('');
  const [newPass,setNewPass]=useState('');
  const [saved,setSaved]=useState(false);
  const [passErr,setPassErr]=useState('');
  const [passOk,setPassOk]=useState(false);

  const doSave=()=>{onSave({...cfg,apiKey,model,mode,systemPrompt:sys});if(name!==user.name||email!==user.email)onUpdateUser({...user,name,email});setSaved(true);setTimeout(()=>setSaved(false),2000);};
  const changePass=()=>{setPassErr('');setPassOk(false);if(!oldPass||!newPass){setPassErr('Preencha as duas senhas.');return;}if(simpleHash(oldPass)!==user.passwordHash){setPassErr('Senha atual incorreta.');return;}if(newPass.length<6){setPassErr('Mínimo 6 caracteres.');return;}onUpdateUser({...user,passwordHash:simpleHash(newPass)});setOldPass('');setNewPass('');setPassOk(true);setTimeout(()=>setPassOk(false),2500);};

  return e('div',{style:{flex:1,overflowY:'auto',padding:24,maxWidth:680}},
    e('div',{style:{marginBottom:24}},
      e('div',{style:{fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:600,color:'#e8e6e0',marginBottom:4}},'Configurações'),
      e('div',{style:{fontSize:12,color:'#7a7d99',fontFamily:"'DM Sans',sans-serif"}},'Personalize sua experiência no Nexus IA'),
    ),
    // AI
    e('div',{style:T.sectionCard},
      e('div',{style:T.sectionTitle},'🤖 Inteligência Artificial'),
      e('div',{style:{marginBottom:14}},
        e('label',{style:T.label},'Groq API Key'),
        e('input',{type:'password',value:apiKey,onChange:ev=>setApiKey(ev.target.value),placeholder:'gsk_…',style:{...T.input,borderColor:apiKey?'rgba(61,158,114,0.5)':'#1e2035'}}),
        e('div',{style:{fontSize:11,color:'#3f4260',marginTop:5,fontFamily:"'DM Sans',sans-serif"}},'Gratuito em ',e('a',{href:'https://console.groq.com',target:'_blank',rel:'noopener',style:{color:'#c8a44a',textDecoration:'underline'}},'console.groq.com')),
      ),
      e('div',{style:{marginBottom:14}},
        e('label',{style:T.label},'Modelo de IA'),
        e('select',{value:model,onChange:ev=>setModel(ev.target.value),style:{...T.input,cursor:'pointer'}},
          MODELS.map(m=>e('option',{key:m.id,value:m.id},m.label))),
      ),
      e('div',{style:{marginBottom:14}},
        e('label',{style:T.label},'Modo do Assistente'),
        e('select',{value:mode,onChange:ev=>setMode(ev.target.value),style:{...T.input,cursor:'pointer'}},
          e('option',{value:'academic'},'🎓 Acadêmico — dissertações, ABNT'),
          e('option',{value:'institutional'},'🏛 Institucional — ofícios, documentos'),
          e('option',{value:'research'},'🔬 Pesquisa — metodologia, artigos'),
          e('option',{value:'technical'},'💻 Técnico — código, arquitetura, devops'),
          e('option',{value:'public'},'⚖️ Pública — Lei 14.133, normas CGU/TCU'),
          e('option',{value:'general'},'💬 Geral — uso livre'),
        ),
      ),
      e('div',null,
        e('label',{style:T.label},'Prompt do Sistema (opcional)'),
        e('textarea',{value:sys,onChange:ev=>setSys(ev.target.value),placeholder:'Personalize o comportamento da IA…',rows:3,style:{...T.input,resize:'vertical',lineHeight:1.6}}),
      ),
    ),
    // Profile
    e('div',{style:T.sectionCard},
      e('div',{style:T.sectionTitle},'👤 Meu Perfil'),
      e('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:10}},
        e('div',null,e('label',{style:T.label},'Nome'),e('input',{value:name,onChange:ev=>setName(ev.target.value),style:T.input})),
        e('div',null,e('label',{style:T.label},'Email'),e('input',{type:'email',value:email,onChange:ev=>setEmail(ev.target.value),style:T.input})),
      ),
      e('div',{style:{fontSize:11,color:'#7a7d99',fontFamily:"'DM Sans',sans-serif"}},'Usuário: ',
        e('code',{style:{fontFamily:"'DM Mono',monospace",color:'#c8a44a',background:'rgba(0,0,0,0.3)',padding:'1px 6px',borderRadius:4}},user.username),
        user.role==='admin'&&e('span',{style:{marginLeft:8,padding:'2px 7px',borderRadius:99,background:'rgba(200,164,74,0.1)',color:'#c8a44a',fontSize:9,fontWeight:700,fontFamily:"'DM Sans',sans-serif"}},'ADMIN'),
      ),
    ),
    // Password
    e('div',{style:T.sectionCard},
      e('div',{style:T.sectionTitle},'🔑 Alterar Senha'),
      e('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}},
        e('div',null,e('label',{style:T.label},'Senha atual'),e('input',{type:'password',value:oldPass,onChange:ev=>setOldPass(ev.target.value),placeholder:'••••••••',style:T.input})),
        e('div',null,e('label',{style:T.label},'Nova senha'),e('input',{type:'password',value:newPass,onChange:ev=>setNewPass(ev.target.value),placeholder:'mínimo 6 caracteres',style:T.input})),
      ),
      passErr&&e('div',{style:{padding:'8px 12px',background:'rgba(192,81,79,0.1)',border:'1px solid rgba(192,81,79,0.25)',borderRadius:7,fontSize:11,color:'#c0514f',marginBottom:10,fontFamily:"'DM Sans',sans-serif"}},'⚠ '+passErr),
      passOk&&e('div',{style:{padding:'8px 12px',background:'rgba(61,158,114,0.1)',border:'1px solid rgba(61,158,114,0.25)',borderRadius:7,fontSize:11,color:'#3d9e72',marginBottom:10,fontFamily:"'DM Sans',sans-serif"}},'✓ Senha alterada.'),
      e('button',{onClick:changePass,style:{padding:'9px 20px',borderRadius:8,border:'1px solid #1e2035',cursor:'pointer',background:'#191a28',color:'#e8e6e0',fontSize:12,fontWeight:600,fontFamily:"'DM Sans',sans-serif",transition:'all 0.15s'},onMouseEnter:ev=>{ev.currentTarget.style.borderColor='rgba(200,164,74,0.4)';ev.currentTarget.style.color='#c8a44a';},onMouseLeave:ev=>{ev.currentTarget.style.borderColor='#1e2035';ev.currentTarget.style.color='#e8e6e0';}},'Alterar senha'),
    ),
    e('button',{onClick:doSave,style:{...T.btnPrimary,width:'auto',padding:'12px 36px',background:saved?'#3d9e72':'linear-gradient(135deg,#c8a44a,#a8843a)',boxShadow:saved?'none':'0 6px 24px rgba(200,164,74,0.2)'}},saved?'✓ Salvo com sucesso':'Salvar configurações'),
  );
}

// ── Admin View ────────────────────────────────────────────────────
function AdminView({currentUser,onUpdate}){
  const [users,setUsers]=useState(()=>ld(K_USERS,[]));
  const [showNew,setShowNew]=useState(false);
  const [filter,setFilter]=useState('todos');
  const [query,setQuery]=useState('');
  const [nU,setNU]=useState({username:'',name:'',email:'',password:'',role:'user'});
  const [nErr,setNErr]=useState('');

  const tog=(id,field)=>{if(id===currentUser.id)return;const u=users.map(x=>x.id===id?{...x,[field]:field==='active'?!x.active:x.role==='admin'?'user':'admin'}:x);sv(K_USERS,u);setUsers(u);};
  const del=id=>{if(id===currentUser.id||!confirm('Excluir este usuário?'))return;const u=users.filter(x=>x.id!==id);sv(K_USERS,u);setUsers(u);};
  const resetPw=id=>{const p=prompt('Nova senha (mín. 6):');if(!p||p.length<6)return;const u=users.map(x=>x.id===id?{...x,passwordHash:simpleHash(p)}:x);sv(K_USERS,u);setUsers(u);alert('Senha redefinida.');};
  const create=()=>{
    setNErr('');
    if(!nU.username||!nU.name||!nU.email||!nU.password){setNErr('Preencha todos os campos.');return;}
    if(nU.password.length<6){setNErr('Mínimo 6 caracteres.');return;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nU.email)){setNErr('Email inválido.');return;}
    if(users.some(x=>x.username===nU.username.trim().toLowerCase())){setNErr('Usuário já existe.');return;}
    const nu={id:uid(),username:nU.username.trim().toLowerCase(),name:nU.name.trim(),email:nU.email.trim().toLowerCase(),passwordHash:simpleHash(nU.password),role:nU.role,createdAt:Date.now(),lastLogin:null,active:true};
    const u=[...users,nu];sv(K_USERS,u);setUsers(u);setNU({username:'',name:'',email:'',password:'',role:'user'});setShowNew(false);
  };

  const filtered=users.filter(u=>{
    const mt=filter==='todos'||(filter==='admin'&&u.role==='admin')||(filter==='user'&&u.role==='user')||(filter==='inativos'&&!u.active);
    return mt&&(!query||u.username.includes(query.toLowerCase())||u.name.toLowerCase().includes(query.toLowerCase())||u.email.includes(query.toLowerCase()));
  });
  const stats={total:users.length,admins:users.filter(u=>u.role==='admin').length,active:users.filter(u=>u.active).length};

  return e('div',{style:{flex:1,overflowY:'auto',padding:24}},
    e('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:20,flexWrap:'wrap',gap:12}},
      e('div',null,
        e('div',{style:{fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:600,color:'#e8e6e0',marginBottom:2}},'Gerenciar Usuários'),
        e('div',{style:{fontSize:12,color:'#7a7d99',fontFamily:"'DM Sans',sans-serif"}},'Cadastre, edite e controle acessos'),
      ),
      e('button',{onClick:()=>setShowNew(!showNew),style:{padding:'9px 18px',borderRadius:8,border:'none',cursor:'pointer',background:showNew?'#191a28':'linear-gradient(135deg,#c8a44a,#a8843a)',color:showNew?'#7a7d99':'#08090f',fontSize:12,fontWeight:700,fontFamily:"'DM Sans',sans-serif",transition:'all 0.15s'}},showNew?'✕ Cancelar':'+ Novo usuário'),
    ),
    // Stats
    e('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:9,marginBottom:18}},
      [{l:'Total',v:stats.total,c:'#c8a44a'},{l:'Admins',v:stats.admins,c:'#7d63c0'},{l:'Ativos',v:stats.active,c:'#3d9e72'},{l:'Inativos',v:users.length-stats.active,c:'#7a7d99'}]
        .map((s,i)=>e('div',{key:i,style:{background:'#141520',border:'1px solid #1e2035',borderRadius:9,padding:'12px 16px'}},
          e('div',{style:{fontSize:9,color:'#7a7d99',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',fontFamily:"'DM Sans',sans-serif",marginBottom:4}},s.l),
          e('div',{style:{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:600,color:s.c}},s.v),
        )),
    ),
    // New user form
    showNew&&e('div',{style:{background:'#141520',border:'1px solid rgba(200,164,74,0.3)',borderRadius:12,padding:18,marginBottom:18,animation:'fadeUp 0.2s ease'}},
      e('div',{style:{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:600,color:'#c8a44a',marginBottom:14}},'Cadastrar novo usuário'),
      e('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:11,marginBottom:11}},
        e('div',null,e('label',{style:T.label},'Nome'),e('input',{value:nU.name,onChange:ev=>setNU({...nU,name:ev.target.value}),style:T.input})),
        e('div',null,e('label',{style:T.label},'Email'),e('input',{type:'email',value:nU.email,onChange:ev=>setNU({...nU,email:ev.target.value}),style:T.input})),
        e('div',null,e('label',{style:T.label},'Usuário'),e('input',{value:nU.username,onChange:ev=>setNU({...nU,username:ev.target.value}),style:T.input})),
        e('div',null,e('label',{style:T.label},'Senha'),e('input',{type:'text',value:nU.password,onChange:ev=>setNU({...nU,password:ev.target.value}),style:T.input,placeholder:'mín. 6 caracteres'})),
        e('div',{style:{gridColumn:'span 2'}},e('label',{style:T.label},'Papel'),e('select',{value:nU.role,onChange:ev=>setNU({...nU,role:ev.target.value}),style:{...T.input,cursor:'pointer'}},e('option',{value:'user'},'Usuário comum'),e('option',{value:'admin'},'Administrador'))),
      ),
      nErr&&e('div',{style:{padding:'7px 11px',background:'rgba(192,81,79,0.1)',border:'1px solid rgba(192,81,79,0.25)',borderRadius:7,fontSize:11,color:'#c0514f',marginBottom:10,fontFamily:"'DM Sans',sans-serif"}},'⚠ '+nErr),
      e('button',{onClick:create,style:{...T.btnPrimary,width:'auto',padding:'9px 22px'}},'Cadastrar usuário'),
    ),
    // Filters
    e('div',{style:{display:'flex',gap:7,marginBottom:13,flexWrap:'wrap',alignItems:'center'}},
      e('input',{value:query,onChange:ev=>setQuery(ev.target.value),placeholder:'Buscar usuário…',style:{flex:1,minWidth:200,...T.input,padding:'7px 12px',fontSize:12}}),
      [['todos','Todos'],['admin','Admins'],['user','Usuários'],['inativos','Inativos']].map(([f,l])=>
        e('button',{key:f,onClick:()=>setFilter(f),style:{padding:'6px 13px',borderRadius:7,cursor:'pointer',border:`1px solid ${filter===f?'rgba(200,164,74,0.35)':'#1e2035'}`,background:filter===f?'rgba(200,164,74,0.08)':'#141520',color:filter===f?'#c8a44a':'#7a7d99',fontSize:11,fontWeight:600,fontFamily:"'DM Sans',sans-serif",transition:'all 0.15s'}},l)),
    ),
    // Table
    e('div',{style:{background:'#141520',border:'1px solid #1e2035',borderRadius:12,overflow:'hidden'}},
      e('div',{style:{display:'grid',gridTemplateColumns:'2fr 1.2fr 2fr 80px 90px 120px',padding:'9px 18px',borderBottom:'1px solid #1e2035',background:'rgba(0,0,0,0.15)',fontSize:9,fontWeight:700,color:'#3f4260',textTransform:'uppercase',letterSpacing:'1px',fontFamily:"'DM Sans',sans-serif"}},
        e('span',null,'Nome'),e('span',null,'Usuário'),e('span',null,'Email'),e('span',null,'Papel'),e('span',null,'Status'),e('span',null,'Ações'),
      ),
      filtered.length===0?e('div',{style:{padding:'36px 20px',textAlign:'center',color:'#7a7d99',fontSize:13,fontFamily:"'DM Sans',sans-serif"}},'Nenhum usuário encontrado'):
      filtered.map((u,i)=>e('div',{key:u.id,style:{display:'grid',gridTemplateColumns:'2fr 1.2fr 2fr 80px 90px 120px',alignItems:'center',padding:'10px 18px',borderBottom:i<filtered.length-1?'1px solid #1e2035':'none',transition:'background 0.12s',opacity:u.active?1:0.5},
        onMouseEnter:ev=>ev.currentTarget.style.background='rgba(200,164,74,0.025)',
        onMouseLeave:ev=>ev.currentTarget.style.background='transparent'},
        e('div',{style:{display:'flex',alignItems:'center',gap:8,minWidth:0}},
          e(Avatar,{role:'user',user:u}),
          e('div',{style:{minWidth:0}},
            e('div',{style:{fontSize:12,fontWeight:600,color:'#e8e6e0',fontFamily:"'DM Sans',sans-serif",overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},u.name),
            e('div',{style:{fontSize:10,color:'#3f4260',fontFamily:"'DM Sans',sans-serif"}},u.lastLogin?`último: ${fmtDate(u.lastLogin)}`:'nunca'),
          ),
        ),
        e('code',{style:{fontSize:11,color:'#c8a44a',fontFamily:"'DM Mono',monospace"}},u.username),
        e('span',{style:{fontSize:11,color:'#7a7d99',fontFamily:"'DM Sans',sans-serif",overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},u.email),
        e('span',{onClick:()=>tog(u.id,'role'),style:{padding:'2px 9px',borderRadius:5,fontSize:10,fontWeight:700,fontFamily:"'DM Sans',sans-serif",cursor:u.id===currentUser.id?'not-allowed':'pointer',background:u.role==='admin'?'rgba(125,99,192,0.12)':'rgba(74,127,193,0.12)',color:u.role==='admin'?'#7d63c0':'#4a7fc1',border:`1px solid ${u.role==='admin'?'rgba(125,99,192,0.3)':'rgba(74,127,193,0.3)'}`}},u.role==='admin'?'ADMIN':'USER'),
        e('span',{onClick:()=>tog(u.id,'active'),style:{padding:'2px 9px',borderRadius:5,fontSize:10,fontWeight:700,fontFamily:"'DM Sans',sans-serif",cursor:u.id===currentUser.id?'not-allowed':'pointer',background:u.active?'rgba(61,158,114,0.12)':'rgba(192,81,79,0.12)',color:u.active?'#3d9e72':'#c0514f',border:`1px solid ${u.active?'rgba(61,158,114,0.25)':'rgba(192,81,79,0.25)'}`}},u.active?'ATIVO':'INATIVO'),
        e('div',{style:{display:'flex',gap:3}},
          e('button',{onClick:()=>resetPw(u.id),title:'Redefinir senha',style:{background:'none',border:'none',color:'#7a7d99',cursor:'pointer',fontSize:12,padding:'3px 6px',borderRadius:4,transition:'all 0.12s'},onMouseEnter:ev=>{ev.currentTarget.style.color='#c8a44a';},onMouseLeave:ev=>{ev.currentTarget.style.color='#7a7d99';}},'🔑'),
          e('button',{onClick:()=>del(u.id),disabled:u.id===currentUser.id,style:{background:'none',border:'none',color:u.id===currentUser.id?'#3f4260':'#7a7d99',cursor:u.id===currentUser.id?'not-allowed':'pointer',fontSize:12,padding:'3px 6px',borderRadius:4,transition:'all 0.12s'},onMouseEnter:ev=>{if(u.id!==currentUser.id)ev.currentTarget.style.color='#c0514f';},onMouseLeave:ev=>{ev.currentTarget.style.color=u.id===currentUser.id?'#3f4260':'#7a7d99';}},'🗑'),
        ),
      ))
    ),
  );
}

// ============================================================
// APP PRINCIPAL
// ============================================================
function NexusIA(){
  const [users,setUsers]=useState(()=>initUsers());
  const [currentUser,setCurrentUser]=useState(()=>{
    const s=ld(K_SESSION,null);if(!s)return null;
    const u=ld(K_USERS,[]).find(x=>x.id===s.userId);return u&&u.active?u:null;
  });
  const [cfg,setCfg]=useState(()=>ld(K_CFG,{apiKey:'',model:DEFAULT_MODEL,mode:'academic',systemPrompt:''}));
  const [convs,setConvs]=useState(()=>ld(K_CONVS,[]));
  const [activeId,setActiveId]=useState(()=>ld(K_CONVS,[])[0]?.id||null);
  const [docs,setDocs]=useState(()=>ld(K_DOCS,[]));
  const [loading,setLoading]=useState(false);
  const [view,setView]=useState('chat');

  useEffect(()=>{sv(K_CONVS,convs);},[convs]);
  useEffect(()=>{sv(K_DOCS,docs);},[docs]);
  useEffect(()=>{sv(K_CFG,cfg);},[cfg]);

  const activeConv=convs.find(c=>c.id===activeId)||null;
  const handleLogin=useCallback(u=>{setCurrentUser(u);setUsers(ld(K_USERS,[]));setView('chat');},[]);
  const handleLogout=useCallback(()=>{localStorage.removeItem(K_SESSION);setCurrentUser(null);},[]);
  const handleUpdateUser=useCallback(upd=>{const all=ld(K_USERS,[]);const na=all.map(u=>u.id===upd.id?upd:u);sv(K_USERS,na);setUsers(na);if(upd.id===currentUser?.id)setCurrentUser(upd);},[currentUser]);
  const newConv=useCallback(()=>{const c={id:uid(),title:'Nova conversa',messages:[],createdAt:Date.now(),updatedAt:Date.now()};setConvs(p=>[c,...p]);setActiveId(c.id);setView('chat');return c;},[]);
  const deleteConv=useCallback(id=>{setConvs(p=>p.filter(c=>c.id!==id));setActiveId(p=>p===id?convs.find(c=>c.id!==id)?.id||null:p);},[convs]);
  const clearConv=useCallback(()=>{if(!activeConv)return;setConvs(p=>p.map(c=>c.id===activeConv.id?{...c,messages:[],title:'Nova conversa',updatedAt:Date.now()}:c));},[activeConv]);
  const deleteDoc=useCallback(id=>setDocs(p=>p.filter(d=>d.id!==id)),[]);
  const downloadDoc=useCallback(d=>{const md=`# ${d.name}\n\n_${fmtDate(d.createdAt)}_\n\n---\n\n${d.content}`;const b=new Blob([md],{type:'text/markdown'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`${d.name.slice(0,50).replace(/[^a-z0-9]/gi,'-')}.md`;a.click();URL.revokeObjectURL(a.href);},[]);

  const handleSend=useCallback(async rawText=>{
    if(!cfg.apiKey||loading)return;
    if(rawText.trim()==='/limpar'){clearConv();return;}
    if(rawText.trim()==='/ajuda'){
      let conv=activeConv||{id:uid(),title:'Ajuda',messages:[],createdAt:Date.now(),updatedAt:Date.now()};
      const help=SLASH_COMMANDS.map(c=>`**${c.cmd}** — ${c.desc}`).join('\n');
      const msgs=[...conv.messages,{id:uid(),role:'user',content:'/ajuda',timestamp:Date.now()},{id:uid(),role:'assistant',content:'📋 **Comandos disponíveis:**\n\n'+help+'\n\n💡 *Digite `/` para autocompletar.*',timestamp:Date.now()}];
      const upd={...conv,messages:msgs,updatedAt:Date.now()};
      setConvs(p=>{const ex=p.find(c=>c.id===upd.id);return ex?p.map(c=>c.id===upd.id?upd:c):[upd,...p];});
      setActiveId(upd.id);return;
    }
    const tools=toolsForSlash(rawText);
    const text=expandSlash(rawText);
    const sys=cfg.systemPrompt||SYSTEM_PROMPTS[cfg.mode]||SYSTEM_PROMPTS.general;
    let conv=activeConv||{id:uid(),title:genTitle(rawText),messages:[],createdAt:Date.now(),updatedAt:Date.now()};
    const userMsg={id:uid(),role:'user',content:rawText,tools,timestamp:Date.now()};
    const aiId=uid();
    const aiMsg={id:aiId,role:'assistant',content:'',timestamp:Date.now()};
    const upd={...conv,title:conv.messages.length===0?genTitle(rawText):conv.title,messages:[...conv.messages,userMsg,aiMsg],updatedAt:Date.now()};
    setConvs(p=>{const ex=p.find(c=>c.id===upd.id);return ex?p.map(c=>c.id===upd.id?upd:c):[upd,...p];});
    setActiveId(upd.id);setLoading(true);
    const history=[...conv.messages.slice(-8),{role:'user',content:text}].map(m=>({role:m.role,content:m.content}));
    try{
      let final='';
      await callGroq(cfg.apiKey,cfg.model||DEFAULT_MODEL,history,sys,partial=>{
        final=partial;
        setConvs(p=>p.map(c=>c.id===upd.id?{...c,messages:c.messages.map(m=>m.id===aiId?{...m,content:partial,toolsDone:true}:m)}:c));
      });
      if(final.length>400){
        const doc={id:uid(),name:genTitle(rawText),content:final,type:docType(final,rawText),createdAt:Date.now()};
        setDocs(p=>[doc,...p]);
        setConvs(p=>p.map(c=>c.id===upd.id?{...c,messages:c.messages.map(m=>m.id===aiId?{...m,savedDoc:doc}:m)}:c));
      }
    }catch(err){
      setConvs(p=>p.map(c=>c.id===upd.id?{...c,messages:c.messages.map(m=>m.id===aiId?{...m,content:`❌ Erro: ${err.message}`}:m)}:c));
    }
    setLoading(false);
  },[activeConv,loading,cfg,clearConv]);

  if(!currentUser)return e(LoginScreen,{onLogin:handleLogin});
  const userCount=ld(K_USERS,[]).length;

  return e('div',{style:{display:'flex',height:'100vh',overflow:'hidden'}},
    e(Sidebar,{user:currentUser,convs,activeId,onSelect:setActiveId,onNew:newConv,onDelete:deleteConv,view,onView:setView,onLogout:handleLogout,userCount}),
    view==='chat'    ?e(ChatView,    {user:currentUser,conv:activeConv,cfg,onSend:handleSend,loading,onClear:clearConv}):null,
    view==='arquivo' ?e(ArquivoView, {docs,onDelete:deleteDoc,onDownload:downloadDoc}):null,
    view==='settings'?e(SettingsView,{user:currentUser,cfg,onSave:setCfg,onUpdateUser:handleUpdateUser}):null,
    view==='admin'&&currentUser.role==='admin'?e(AdminView,{currentUser,onUpdate:handleUpdateUser}):null,
  );
}

window.__NexusIA = NexusIA;

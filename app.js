const { useState, useEffect, useRef, useCallback, useMemo } = React;
const e = React.createElement;

// ── Supabase Config ───────────────────────────────────────────────
const SUPABASE_URL = 'https://wtlaxmtsanhzonaiubsh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Ah7oFW9qXMg4-8U47U5Tag_dZJpQmro';

const sb = {
  headers: () => ({
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  }),
  async get(table, query='') {
    try { const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {headers: sb.headers()}); if(!r.ok) return null; return await r.json(); }
    catch(err){ return null; }
  },
  async upsert(table, rows) {
    try { const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=id`, {method:'POST', headers:{...sb.headers(), 'Prefer':'return=representation,resolution=merge-duplicates'}, body: JSON.stringify(Array.isArray(rows)?rows:[rows])}); return r.ok ? await r.json() : null; }
    catch(err){ return null; }
  },
  async upsertOn(table, rows, onConflict) {
    try { const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {method:'POST', headers:{...sb.headers(), 'Prefer':'return=representation,resolution=merge-duplicates'}, body: JSON.stringify(Array.isArray(rows)?rows:[rows])}); return r.ok ? await r.json() : null; }
    catch(err){ return null; }
  },
  async delete(table, query) {
    try { const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {method:'DELETE', headers: sb.headers()}); return r.ok; }
    catch(err){ return false; }
  },
};

// ── Models ────────────────────────────────────────────────────────
const MODELS = [
  { id:'llama-3.3-70b-versatile',                   label:'Llama 3.3 70B — Equilíbrio recomendado ⭐',  ctx:128000 },
  { id:'openai/gpt-oss-20b',                        label:'GPT-OSS 20B — Rápido e inteligente',         ctx:131072 },
  { id:'llama-3.1-8b-instant',                      label:'Llama 3.1 8B — Ultra rápido',                ctx:128000 },
  { id:'meta-llama/llama-4-scout-17b-16e-instruct', label:'Llama 4 Scout — Multimodal',                 ctx:131072 },
  { id:'qwen/qwen3-32b',                            label:'Qwen 3 32B — Raciocínio estruturado',        ctx:131072 },
  { id:'openai/gpt-oss-120b',                       label:'GPT-OSS 120B — Máxima (pode exceder TPM free)', ctx:131072 },
  { id:'moonshotai/kimi-k2-0905',                   label:'Kimi K2 — Contexto 262k (pode exceder TPM free)', ctx:262144 },
];
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

// ── Storage keys ──────────────────────────────────────────────────
const K_USERS   = 'nexus-users-v2';
const K_SESSION = 'nexus-session-v2';
const K_CFG     = 'nexus-cfg-v2';
const K_CONVS   = 'nexus-convs-v2';
const K_DOCS    = 'nexus-docs-v2';
const K_THEME   = 'nexus-theme-v1';

// ── Temas ─────────────────────────────────────────────────────────
const THEMES = [
  { id:'dark',  name:'Noturno',  desc:'Elegância e foco', icon:'🌙', bg:'#0b0c14', accent:'#c8a44a' },
  { id:'light', name:'Editorial',desc:'Leitura clara',    icon:'☀',  bg:'#faf8f3', accent:'#a8863b' },
  { id:'azure', name:'Céu',      desc:'Calma e clareza',  icon:'✦',  bg:'#eef4fb', accent:'#2d5fa0' },
];

// ── Slash commands ────────────────────────────────────────────────
const SLASH_COMMANDS = [
  { cmd:'/ajuda', desc:'Lista todos os comandos', icon:'❓', cat:'sistema' },
  { cmd:'/oficio', desc:'Gera ofício institucional formal', icon:'📄', cat:'acadêmico' },
  { cmd:'/resumo', desc:'Cria resumo acadêmico (ABNT NBR 6028)', icon:'📝', cat:'acadêmico' },
  { cmd:'/revisar', desc:'Revisa texto com normas ABNT', icon:'🔍', cat:'acadêmico' },
  { cmd:'/metodologia', desc:'Sugere metodologia de pesquisa', icon:'🔬', cat:'acadêmico' },
  { cmd:'/cronograma', desc:'Cria cronograma de pós-graduação', icon:'📅', cat:'acadêmico' },
  { cmd:'/banca', desc:'Simula perguntas de banca examinadora', icon:'🎓', cat:'acadêmico' },
  { cmd:'/abnt', desc:'Formata referência bibliográfica ABNT', icon:'📚', cat:'acadêmico' },
  { cmd:'/briefing', desc:'Briefing de reunião de orientação', icon:'📋', cat:'acadêmico' },
  { cmd:'/projeto', desc:'Workflow completo: explorar → projetar → revisar', icon:'🏗', cat:'técnico' },
  { cmd:'/explorar', desc:'Analisa código/arquitetura em profundidade', icon:'🧭', cat:'técnico' },
  { cmd:'/arquitetura', desc:'Desenha arquitetura com 3 abordagens', icon:'📐', cat:'técnico' },
  { cmd:'/revisar-codigo', desc:'Revisa código (bugs, clean code, DRY)', icon:'🧹', cat:'técnico' },
  { cmd:'/explicar', desc:'Explica código trecho por trecho', icon:'💡', cat:'técnico' },
  { cmd:'/testes', desc:'Gera testes unitários para o código', icon:'🧪', cat:'técnico' },
  { cmd:'/commit', desc:'Mensagem de commit + PR description', icon:'💾', cat:'técnico' },
  { cmd:'/relatorio', desc:'Relatório técnico estruturado', icon:'📊', cat:'profissional' },
  { cmd:'/analise', desc:'Análise crítica estruturada', icon:'⚖️', cat:'profissional' },
  { cmd:'/plano', desc:'Plano de ação com prazos e responsáveis', icon:'🎯', cat:'profissional' },
  { cmd:'/parecer', desc:'Parecer técnico fundamentado', icon:'⚖', cat:'profissional' },
  { cmd:'/limpar', desc:'Limpa histórico desta conversa', icon:'🗑', cat:'sistema' },
];

// ── System prompts: DIRETOS E ESTRUTURADOS ────────────────────────
const SYSTEM_PROMPTS = {
  academic:`Você é o Nexus IA, assistente acadêmico para pós-graduação brasileira.

REGRA DE OURO — SEJA DIRETO:
• NUNCA comece com "Ótima pergunta", "Aqui está", "Vou te ajudar", "Com prazer", "Claro" ou similares
• NUNCA termine com "Espero ter ajudado", "Se precisar de mais", "Ficou alguma dúvida"
• Entre DIRETO no conteúdo da resposta
• Zero preâmbulos, zero despedidas — apenas o essencial

ESTRUTURA:
• Use ## para títulos, **negrito** para termos-chave, listas para itens
• Seja substancial mas conciso — cada palavra deve agregar
• Cite normas ABNT quando aplicável (NBR 6023, 6028, 14724, 10520)
• Use tabelas quando for comparação
• Português brasileiro, registro formal acadêmico`,

  institutional:`Você é o Nexus IA, especialista em redação oficial brasileira (Manual de Redação da Presidência da República, 3ª ed.).

REGRA DE OURO — SEJA DIRETO:
• NUNCA comece com "Segue abaixo", "Aqui está", "Vou gerar" ou similares
• ENTREGUE o documento pronto, direto, sem narração
• Zero explicações antes ou depois, salvo se explicitamente solicitado

ESTRUTURA DO DOCUMENTO:
• Ofício: cabeçalho (órgão, nº, local/data) → destinatário → vocativo → corpo numerado → fecho → assinatura
• Use pronomes de tratamento corretos (VEx.ª, VSª)
• Cite fundamentação legal (Lei, Decreto, artigo) quando pertinente
• Linguagem: impessoalidade, formalidade, concisão, clareza, uniformidade`,

  research:`Você é o Nexus IA, assistente de pesquisa científica (metodologia, estatística, redação acadêmica).

REGRA DE OURO — SEJA DIRETO:
• NUNCA comece com "Ótima pergunta", "Vou explicar", "É importante notar"
• Entre DIRETO na metodologia/análise/explicação
• Zero filosofar — vá ao técnico

ESTRUTURA:
• Metodologia: tipo, abordagem, procedimentos, instrumentos, análise — tudo justificado
• Estatística: indique teste, pressupostos, tamanho de efeito
• Revisão sistemática: PRISMA, critérios, bases
• Artigos: IMRAD (Introdução, Métodos, Resultados, Discussão)
• Referências: Creswell, Yin, Gil, Marconi & Lakatos, Minayo`,

  technical:`Você é o Nexus IA em modo técnico — engenheiro de software sênior.

REGRA DE OURO — SEJA DIRETO:
• Zero "Ótima pergunta", "Aqui está", "Vou te mostrar"
• Código PRIMEIRO, explicação breve depois (se necessária)
• Comentários no próprio código, não em parágrafos antes

ESTRUTURA:
• Forneça código FUNCIONAL e completo em blocos \`\`\`linguagem
• Comente partes não-triviais dentro do código
• Aponte armadilhas em bullet points ao final (se houver)
• Sugira testes só se pedido explicitamente
• Considere: performance, segurança, manutenibilidade, SOLID, DRY`,

  public:`Você é o Nexus IA especializado em Administração Pública Federal brasileira.

REGRA DE OURO — SEJA DIRETO:
• Entre direto na fundamentação legal e no ponto
• Zero preâmbulos do tipo "Conforme a legislação vigente"
• Cite artigo, parágrafo, inciso — sempre específico

DOMÍNIOS:
• Licitações: Lei 14.133/2021, IN SEGES/ME 65/2021, IN SEGES 5/2017
• Patrimônio: Decreto 12.785/2025, NBC TSP 07, Lei 4.320/1964, IN SEDAP 205/1988
• Finanças: LRF (LC 101/2000), SIAFI
• Controle: CGU, TCU (indique acórdãos quando relevante)
• Servidores: Lei 8.112/1990

ESTRUTURA DE PARECER:
Relatório → Análise Técnica (fundamentada) → Conclusão → Recomendação`,

  general:`Você é o Nexus IA, assistente generativo versátil.

REGRA DE OURO — SEJA DIRETO:
• NUNCA: "Ótima pergunta", "Vou te ajudar", "Aqui está", "Espero ter ajudado"
• Entre DIRETO no conteúdo — zero preâmbulos, zero despedidas
• A primeira linha deve responder à pergunta

ESTRUTURA:
• Use ## títulos, **negrito**, listas, tabelas quando úteis
• Direto ao ponto mas com estrutura clara
• Exemplos concretos > teoria abstrata
• Português brasileiro`,
};

function expandSlash(text) {
  const l = text.toLowerCase();
  if(l.startsWith('/oficio')){const a=text.slice(7).trim();return`Gere um ofício institucional formal e completo${a?' sobre: '+a:' para solicitação de reunião/parceria'}. Inclua: cabeçalho com número e data, destinatário, assunto, fundamentação legal, desenvolvimento em seções numeradas, conclusão e fecho padrão.`;}
  if(l.startsWith('/resumo')){const a=text.slice(7).trim();return`Elabore um resumo acadêmico estruturado${a?' sobre: '+a:''}. Siga ABNT NBR 6028: objetivos, metodologia, resultados e conclusões. Inclua palavras-chave. 150-500 palavras.`;}
  if(l.startsWith('/revisar-codigo')){const c=text.slice(15).trim();return c?`Revise este código focando em: (1) Bugs e corretude lógica, (2) Simplicidade, DRY, clean code, (3) Conformidade com convenções. Para cada problema: severidade (alta/média/baixa), linha aproximada, solução.\n\nCódigo:\n${c}`:`Pronto para revisar código. Cole o código em bloco \`\`\`linguagem.`;}
  if(l.startsWith('/revisar')){const c=text.slice(8).trim();return c?`Revise este texto acadêmico: erros gramaticais, registro formal, normas ABNT, coesão, coerência.\n\nTexto:\n${c}`:`Cole o texto que deseja revisar.`;}
  if(l.startsWith('/metodologia')){const t=text.slice(12).trim();return`Sugira metodologia de pesquisa científica${t?' para: '+t:''}. Inclua: tipo, abordagem (qual/quant/mista), instrumentos, população, análise. Justifique cada escolha.`;}
  if(l.startsWith('/cronograma')){const i=text.slice(11).trim();return`Crie cronograma detalhado de pós-graduação${i?' com: '+i:' para mestrado de 24 meses'}. Fases: disciplinas, bibliográfica, coleta, qualificação, análise, redação, defesa.`;}
  if(l.startsWith('/banca')){const t=text.slice(6).trim();return`Simule 5 perguntas desafiadoras de banca de mestrado${t?' sobre: '+t:''}. Para cada uma: nível (baixo/médio/alto) e aspecto avaliado.`;}
  if(l.startsWith('/abnt')){const r=text.slice(5).trim();return r?`Formate segundo ABNT NBR 6023:2018: ${r}`:`Informe os dados da obra para formatar segundo ABNT NBR 6023:2018.`;}
  if(l.startsWith('/briefing')){const a=text.slice(9).trim();return`Gere briefing para reunião de orientação${a?' sobre: '+a:''}. Inclua: pauta, pontos de atenção, pendências, próximos passos, perguntas-guia.`;}
  if(l.startsWith('/projeto')){const t=text.slice(8).trim();return`Desenvolva uma feature em 5 fases${t?' para: '+t:''}.\n\n**FASE 1 — Discovery:** perguntas para entender problema e requisitos.\n**FASE 2 — Exploração:** aspectos do sistema a entender.\n**FASE 3 — Perguntas finais:** ambiguidades (edge cases, error handling).\n**FASE 4 — Arquitetura:** 3 abordagens (minimal, clean, pragmática) com trade-offs e recomendação.\n**FASE 5 — Implementação + Revisão:** código limpo + auto-revisão.\n\nComece pela Fase 1.`;}
  if(l.startsWith('/explorar')){const t=text.slice(9).trim();return`Analise em profundidade${t?': '+t:''}. Entregue:\n1. Entry points (arquivo:linha)\n2. Fluxo de execução\n3. Componentes e responsabilidades\n4. Camadas de arquitetura\n5. Dependências\n6. Insights de design\n7. Arquivos essenciais`;}
  if(l.startsWith('/arquitetura')){const t=text.slice(12).trim();return`Desenhe arquitetura${t?' para: '+t:''} com 3 abordagens:\n\n**1. Minimal Changes** — menor mudança, máximo reuso\n**2. Clean Architecture** — manutenibilidade, abstrações\n**3. Pragmatic Balance** — velocidade + qualidade\n\nPara cada: descrição, componentes, prós, contras, trade-offs, complexidade. Finalize com recomendação fundamentada.`;}
  if(l.startsWith('/explicar')){const c=text.slice(9).trim();return c?`Explique trecho por trecho:\n- O que cada bloco faz\n- Por que foi escrito assim\n- Armadilhas\n- Sugestões\n\nCódigo:\n${c}`:`Cole o código que deseja entender.`;}
  if(l.startsWith('/testes')){const c=text.slice(7).trim();return c?`Gere testes unitários: happy path, edge cases, error handling. Use AAA (Arrange-Act-Assert) e nomes descritivos.\n\nCódigo a testar:\n${c}`:`Cole o código que precisa de testes.`;}
  if(l.startsWith('/commit')){const d=text.slice(7).trim();return`Mensagem de commit (Conventional Commits) + descrição de PR completa${d?' para: '+d:''}. PR: O que mudou, Por que, Como testar, Breaking changes.`;}
  if(l.startsWith('/relatorio')){const t=text.slice(10).trim();return`Relatório técnico completo${t?' sobre: '+t:''}. Estrutura: Sumário Executivo, Contextualização, Metodologia, Análise, Resultados, Conclusões, Recomendações. Use tabelas.`;}
  if(l.startsWith('/analise')){const t=text.slice(8).trim();return`Análise crítica estruturada${t?' de: '+t:''}: (1) Contexto, (2) Pontos fortes, (3) Pontos fracos, (4) Oportunidades, (5) Riscos, (6) Recomendações acionáveis.`;}
  if(l.startsWith('/plano')){const t=text.slice(6).trim();return`Plano de ação executável${t?' para: '+t:''}: objetivo SMART, etapas numeradas com prazos, responsáveis, recursos, KPIs, riscos/mitigação. Use tabela.`;}
  if(l.startsWith('/parecer')){const t=text.slice(8).trim();return`Parecer técnico fundamentado${t?' sobre: '+t:''}. Estrutura: I - Relatório, II - Análise Técnica (com fundamentação legal), III - Conclusão, IV - Recomendação. Cite dispositivos.`;}
  return text;
}

function toolsForSlash(text) {
  const l = text.toLowerCase();
  if(l.startsWith('/oficio'))      return [{name:'DocumentGenerator', icon:'📄', args:'<b>type</b>=ofício · <b>format</b>=ABNT'}];
  if(l.startsWith('/revisar-codigo')) return [{name:'CodeReviewer', icon:'🧹', args:'<b>checks</b>=bugs,DRY,conventions'}];
  if(l.startsWith('/revisar'))     return [{name:'AcademicReviewer', icon:'🔍', args:'<b>standard</b>=ABNT'}];
  if(l.startsWith('/resumo'))      return [{name:'SummaryGenerator', icon:'📝', args:'<b>format</b>=NBR-6028'}];
  if(l.startsWith('/metodologia')) return [{name:'MethodologyAdvisor', icon:'🔬', args:'<b>approach</b>=mixed'}];
  if(l.startsWith('/cronograma'))  return [{name:'SchedulePlanner', icon:'📅', args:'<b>type</b>=post-grad'}];
  if(l.startsWith('/banca'))       return [{name:'ExamSimulator', icon:'🎓', args:'<b>questions</b>=5'}];
  if(l.startsWith('/abnt'))        return [{name:'ABNTFormatter', icon:'📚', args:'<b>norm</b>=NBR-6023:2018'}];
  if(l.startsWith('/briefing'))    return [{name:'BriefingGenerator', icon:'📋', args:'<b>type</b>=orientation'}];
  if(l.startsWith('/projeto'))     return [{name:'FeatureDevWorkflow', icon:'🏗', args:'<b>phases</b>=5'}];
  if(l.startsWith('/explorar'))    return [{name:'CodeExplorer', icon:'🧭', args:'<b>depth</b>=full'}];
  if(l.startsWith('/arquitetura')) return [{name:'CodeArchitect', icon:'📐', args:'<b>approaches</b>=3'}];
  if(l.startsWith('/explicar'))    return [{name:'CodeExplainer', icon:'💡', args:'<b>depth</b>=line-by-line'}];
  if(l.startsWith('/testes'))      return [{name:'TestGenerator', icon:'🧪', args:'<b>pattern</b>=AAA'}];
  if(l.startsWith('/commit'))      return [{name:'GitCommitHelper', icon:'💾', args:'<b>convention</b>=conventional'}];
  if(l.startsWith('/relatorio'))   return [{name:'ReportGenerator', icon:'📊', args:'<b>structure</b>=executive'}];
  if(l.startsWith('/analise'))     return [{name:'SWOTAnalyzer', icon:'⚖️', args:'<b>framework</b>=SWOT+'}];
  if(l.startsWith('/plano'))       return [{name:'ActionPlanner', icon:'🎯', args:'<b>method</b>=SMART'}];
  if(l.startsWith('/parecer'))     return [{name:'TechnicalOpinion', icon:'⚖', args:'<b>structure</b>=RAC'}];
  return [];
}

// ── Utils ─────────────────────────────────────────────────────────
function uid(){ return Math.random().toString(36).slice(2)+Date.now().toString(36); }
function fmtDate(ts){ return new Date(ts).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}); }
function fmtTime(ts){ return new Date(ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); }
function genTitle(t){ return t.length>50?t.slice(0,47)+'…':t; }
function simpleHash(s){ let h=0;for(let i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;}return 'h'+Math.abs(h).toString(36); }
function docType(txt,q){ const s=(q+' '+txt).toLowerCase(); if(/relatório|inventário|diagnóstico/.test(s))return'relatorio'; if(/ofício|rascunho|email|carta/.test(s))return'rascunho'; return'analise'; }
const TYPE_META={relatorio:{label:'Relatório',icon:'📄'},analise:{label:'Análise',icon:'📊'},rascunho:{label:'Rascunho',icon:'📝'}};
const ld=(k,fb)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):fb;}catch{return fb;}};
const sv=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};

// ── Theme management ─────────────────────────────────────────────
function applyTheme(theme){
  document.documentElement.classList.add('theme-transition');
  document.documentElement.setAttribute('data-theme', theme);
  sv(K_THEME, theme);
  setTimeout(()=>document.documentElement.classList.remove('theme-transition'), 400);
}

// ── Mappers Supabase ↔ JS ────────────────────────────────────────
const u_fromDb = r => ({id:r.id, username:r.username, name:r.name, email:r.email, passwordHash:r.password_hash, role:r.role, active:r.active, lastLogin: r.last_login ? new Date(r.last_login).getTime() : null, createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now()});
const u_toDb = u => ({id:u.id, username:u.username, name:u.name, email:u.email, password_hash:u.passwordHash, role:u.role, active:u.active!==false, last_login: u.lastLogin ? new Date(u.lastLogin).toISOString() : null, created_at: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString()});
const c_fromDb = r => ({id:r.id, title:r.title, messages:r.messages||[], model:r.model, mode:r.mode, createdAt:new Date(r.created_at).getTime(), updatedAt:new Date(r.updated_at).getTime()});
const c_toDb = (c,uid) => ({id:c.id, user_id:uid, title:c.title, messages:c.messages||[], model:c.model||null, mode:c.mode||null, created_at:new Date(c.createdAt||Date.now()).toISOString(), updated_at:new Date(c.updatedAt||Date.now()).toISOString()});
const d_fromDb = r => ({id:r.id, name:r.name, content:r.content, type:r.type, createdAt:new Date(r.created_at).getTime()});
const d_toDb = (d,uid) => ({id:d.id, user_id:uid, name:d.name, content:d.content||'', type:d.type||'analise', created_at:new Date(d.createdAt||Date.now()).toISOString()});

async function cloudGetUsers(){ const r = await sb.get('nexus_users', '?select=*&order=created_at.asc'); return r ? r.map(u_fromDb) : null; }
async function cloudSaveUser(u){ sb.upsert('nexus_users', u_toDb(u)); }
async function cloudDeleteUser(id){ sb.delete('nexus_users', `?id=eq.${id}`); }
async function cloudGetConvs(userId){ const r = await sb.get('nexus_conversations', `?user_id=eq.${userId}&select=*&order=updated_at.desc&limit=200`); return r ? r.map(c_fromDb) : null; }
async function cloudSaveConv(c, userId){ sb.upsert('nexus_conversations', c_toDb(c,userId)); }
async function cloudDeleteConv(id){ sb.delete('nexus_conversations', `?id=eq.${id}`); }
async function cloudGetDocs(userId){ const r = await sb.get('nexus_documents', `?user_id=eq.${userId}&select=*&order=created_at.desc&limit=300`); return r ? r.map(d_fromDb) : null; }
async function cloudSaveDoc(d, userId){ sb.upsert('nexus_documents', d_toDb(d,userId)); }
async function cloudDeleteDoc(id){ sb.delete('nexus_documents', `?id=eq.${id}`); }
async function cloudGetSettings(userId){ const r = await sb.get('nexus_settings', `?user_id=eq.${userId}&select=*&limit=1`); if(!r||r.length===0) return null; const x=r[0]; return {apiKey:x.api_key||'', model:x.model, mode:x.mode||'academic', systemPrompt:x.system_prompt||''}; }
async function cloudSaveSettings(userId, cfg){ sb.upsertOn('nexus_settings', {user_id:userId, api_key:cfg.apiKey||'', model:cfg.model||null, mode:cfg.mode||'academic', system_prompt:cfg.systemPrompt||'', updated_at:new Date().toISOString()}, 'user_id'); }
async function cloudPing(){ try{ const r=await fetch(`${SUPABASE_URL}/rest/v1/nexus_users?select=id&limit=1`, {headers:sb.headers()}); return r.ok;}catch{return false;} }

function initUsers(){
  const ex=ld(K_USERS,null);
  if(ex&&ex.length>0)return ex;
  const a={id:uid(),username:'admin',name:'Administrador',email:'admin@nexusia.com',passwordHash:simpleHash('admin123'),role:'admin',createdAt:Date.now(),lastLogin:null,active:true};
  sv(K_USERS,[a]);
  cloudSaveUser(a);
  return[a];
}

// ── Groq streaming (corrigido para UTF-8) ────────────────────────
async function callGroq(apiKey, model, msgs, sys, onChunk){
  let maxTokens = 4096;
  if(model.includes('gpt-oss-120b')) maxTokens = 2048;
  else if(model.includes('kimi-k2')) maxTokens = 2048;
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`},
    body: JSON.stringify({model, stream:true, max_tokens:maxTokens, temperature:0.7,
      messages:[{role:'system',content:sys},...msgs.map(m=>({role:m.role,content:m.content}))]}),
  });
  if(!res.ok){const err=await res.json().catch(()=>({}));throw new Error(err?.error?.message||`Erro ${res.status}`);}
  const reader = res.body.getReader();
  const dec = new TextDecoder('utf-8');
  let full = '', buf = '';
  while(true){
    const {done, value} = await reader.read();
    buf += dec.decode(value||new Uint8Array(), {stream:!done});
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for(const raw of lines){
      const line = raw.trim();
      if(!line || !line.startsWith('data: ')) continue;
      const d = line.slice(6);
      if(d === '[DONE]') continue;
      try{ const delta = JSON.parse(d).choices?.[0]?.delta?.content || ''; if(delta){full += delta; onChunk(full);} }catch{}
    }
    if(done) break;
  }
  return full;
}

// ── CSS var helper ────────────────────────────────────────────────
const v = (name) => `var(--${name})`;

// ── Markdown ──────────────────────────────────────────────────────
function Md({content}){
  const html = useMemo(()=>window.marked ? window.marked.parse(content||'') : (content||'').replace(/\n/g,'<br>'), [content]);
  return e('div', {className:'prose', dangerouslySetInnerHTML:{__html:html}});
}

// ── Theme-aware common styles (via CSS vars) ─────────────────────
const T = {
  btnPrimary: {
    padding:'12px 0', width:'100%', borderRadius:10, border:'none', cursor:'pointer',
    background:`linear-gradient(135deg, ${v('accent-l')}, ${v('accent')}, ${v('accent-deep')})`,
    color:'#fff', fontFamily:"var(--sans)", fontSize:13, fontWeight:700, letterSpacing:'0.4px',
    transition:'all 0.2s', boxShadow:`0 8px 24px ${v('accent-glow')}`,
  },
  input: {
    width:'100%', background:v('surface'), border:`1px solid ${v('border')}`, borderRadius:10,
    padding:'11px 14px', color:v('text'), fontFamily:"var(--sans)",
    fontSize:13.5, outline:'none', transition:'border-color 0.2s, box-shadow 0.2s',
  },
  label: {
    fontFamily:"var(--sans)", fontSize:10, fontWeight:700, color:v('muted'),
    display:'block', marginBottom:7, textTransform:'uppercase', letterSpacing:'1.2px',
  },
  sectionCard: {
    marginBottom:22, padding:22, background:v('card'),
    border:`1px solid ${v('border')}`, borderRadius:14,
    boxShadow:`0 2px 8px ${v('shadow')}`,
  },
  sectionTitle: {
    fontFamily:"var(--display)", fontSize:19, fontWeight:700, color:v('text'),
    marginBottom:16, display:'flex', alignItems:'center', gap:10, letterSpacing:'-0.3px',
  },
};

// ═══════════════════════════════════════════════════════════════
// THEME SWITCHER COMPONENT
// ═══════════════════════════════════════════════════════════════
function ThemeSwitcher({currentTheme, onChange, compact}){
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(()=>{
    const handler = ev=>{ if(ref.current && !ref.current.contains(ev.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return ()=>document.removeEventListener('mousedown', handler);
  },[]);

  const current = THEMES.find(t=>t.id===currentTheme) || THEMES[0];

  return e('div', {ref, style:{position:'relative'}},
    e('button', {
      onClick:()=>setOpen(o=>!o),
      style:{
        display:'flex', alignItems:'center', gap:7,
        padding: compact?'6px 10px':'8px 13px',
        background:v('elevated'), border:`1px solid ${v('border')}`,
        borderRadius:9, cursor:'pointer', color:v('text'),
        fontSize:compact?11:12, fontWeight:600, fontFamily:"var(--sans)",
        transition:'all 0.15s',
      },
      onMouseEnter:ev=>{ev.currentTarget.style.borderColor=`var(--accent)`; ev.currentTarget.style.color=v('accent');},
      onMouseLeave:ev=>{ev.currentTarget.style.borderColor=v('border'); ev.currentTarget.style.color=v('text');}
    },
      e('span', {style:{fontSize:compact?13:15}}, current.icon),
      !compact && e('span', null, current.name),
      e('span', {style:{fontSize:9, color:v('muted'), marginLeft:2}}, '▾'),
    ),
    open && e('div', {
      style:{
        position:'absolute', top:'calc(100% + 6px)', right:0,
        background:v('card'), border:`1px solid ${v('border')}`, borderRadius:11,
        padding:6, minWidth:210, zIndex:100,
        boxShadow:`0 12px 32px ${v('shadow')}`,
        animation:'fadeUp 0.18s ease',
      },
    },
      e('div', {style:{fontSize:9, fontWeight:700, color:v('muted'), padding:'5px 11px 7px', letterSpacing:'1.2px', textTransform:'uppercase'}}, 'Tema visual'),
      THEMES.map(t=>e('div', {
        key:t.id, onClick:()=>{onChange(t.id); setOpen(false);},
        style:{
          display:'flex', alignItems:'center', gap:11, padding:'9px 11px',
          borderRadius:8, cursor:'pointer', transition:'background 0.12s',
          background: t.id===currentTheme ? v('accent-dim') : 'transparent',
        },
        onMouseEnter:ev=>{if(t.id!==currentTheme) ev.currentTarget.style.background = v('elevated');},
        onMouseLeave:ev=>{if(t.id!==currentTheme) ev.currentTarget.style.background = 'transparent';},
      },
        e('div', {style:{width:28, height:28, borderRadius:7, background:t.bg, border:`2px solid ${t.accent}`, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13}}, t.icon),
        e('div', {style:{flex:1, minWidth:0}},
          e('div', {style:{fontSize:12.5, fontWeight:600, color: t.id===currentTheme ? v('accent') : v('text'), fontFamily:"var(--sans)"}}, t.name),
          e('div', {style:{fontSize:10, color:v('muted'), fontFamily:"var(--sans)"}}, t.desc),
        ),
        t.id===currentTheme && e('span', {style:{color:v('accent'), fontSize:13}}, '✓'),
      ))
    )
  );
}

// ═══════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════════════════
function LoginScreen({onLogin, theme, onChangeTheme}){
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const doLogin = async () => {
    if(!username || !password){ setErr('Preencha usuário e senha.'); return; }
    setLoading(true); setErr('');
    const cloudUsers = await cloudGetUsers();
    if(cloudUsers) sv(K_USERS, cloudUsers);
    const users = ld(K_USERS, []);
    const u = users.find(x=>x.username===username.trim().toLowerCase());
    if(!u || !u.active || u.passwordHash !== simpleHash(password)){
      setErr(!u ? 'Usuário não encontrado.' : !u.active ? 'Conta desativada.' : 'Senha incorreta.');
      setLoading(false); return;
    }
    u.lastLogin = Date.now();
    sv(K_USERS, users.map(x=>x.id===u.id?u:x));
    sv(K_SESSION, {userId:u.id, loggedAt:Date.now()});
    cloudSaveUser(u);
    onLogin(u);
  };

  const doRegister = async () => {
    if(!username || !password || !name || !email){ setErr('Preencha todos os campos.'); return; }
    if(password.length < 6){ setErr('Senha mínima: 6 caracteres.'); return; }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ setErr('Email inválido.'); return; }
    const cloudUsers = await cloudGetUsers();
    if(cloudUsers) sv(K_USERS, cloudUsers);
    const users = ld(K_USERS, []);
    if(users.some(x=>x.username===username.trim().toLowerCase())){ setErr('Usuário já existe.'); return; }
    setLoading(true); setErr('');
    const nu = {id:uid(), username:username.trim().toLowerCase(), name:name.trim(), email:email.trim().toLowerCase(), passwordHash:simpleHash(password), role:'user', createdAt:Date.now(), lastLogin:Date.now(), active:true};
    sv(K_USERS, [...users, nu]);
    sv(K_SESSION, {userId:nu.id, loggedAt:Date.now()});
    cloudSaveUser(nu);
    onLogin(nu);
  };

  const submit = mode === 'login' ? doLogin : doRegister;

  return e('div', {style:{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24, position:'relative', overflow:'hidden'}},
    // Theme switcher absolute top-right
    e('div', {style:{position:'absolute', top:20, right:20, zIndex:10}},
      e(ThemeSwitcher, {currentTheme:theme, onChange:onChangeTheme}),
    ),

    // Ambient glows (via CSS var already on body::before)
    e('div', {style:{width:'100%', maxWidth:440, background:v('card'), border:`1px solid ${v('border')}`, borderRadius:20, padding:'46px 38px', boxShadow:`0 28px 72px ${v('shadow')}`, animation:'fadeUp 0.4s ease'}},

      // Brand
      e('div', {style:{textAlign:'center', marginBottom:36}},
        e('div', {style:{fontFamily:"var(--display)", fontSize:44, fontWeight:700, color:v('accent'), letterSpacing:'-1.2px', lineHeight:1}}, 'Nexus IA'),
        e('div', {style:{fontFamily:"var(--sans)", fontSize:11, color:v('muted'), marginTop:8, letterSpacing:'2px', textTransform:'uppercase', fontWeight:500}}, 'Assistente Generativo Inteligente'),
        e('div', {style:{width:40, height:2, background:`linear-gradient(90deg, transparent, ${v('accent')}, transparent)`, margin:'18px auto 0'}}),
      ),

      // Tabs
      e('div', {style:{display:'flex', gap:3, padding:3, background:v('surface'), border:`1px solid ${v('border')}`, borderRadius:10, marginBottom:24}},
        ['login', 'register'].map(m => e('button', {
          key:m, onClick:()=>{setMode(m); setErr('');},
          style:{
            flex:1, padding:'9px', borderRadius:8, border:'none', cursor:'pointer',
            background: mode===m ? v('accent-dim') : 'transparent',
            color: mode===m ? v('accent') : v('muted'),
            fontSize:12.5, fontWeight:600, fontFamily:"var(--sans)", transition:'all 0.15s',
          }
        }, {login:'Entrar', register:'Criar conta'}[m]))
      ),

      // Fields
      mode === 'register' && e('div', {style:{marginBottom:14}},
        e('label', {style:T.label}, 'Nome completo'),
        e('input', {value:name, onChange:ev=>setName(ev.target.value), placeholder:'Seu nome completo', style:T.input,
          onFocus:ev=>ev.target.style.borderColor=v('accent'), onBlur:ev=>ev.target.style.borderColor=v('border')}),
      ),
      mode === 'register' && e('div', {style:{marginBottom:14}},
        e('label', {style:T.label}, 'Email'),
        e('input', {type:'email', value:email, onChange:ev=>setEmail(ev.target.value), placeholder:'voce@email.com', style:T.input,
          onFocus:ev=>ev.target.style.borderColor=v('accent'), onBlur:ev=>ev.target.style.borderColor=v('border')}),
      ),
      e('div', {style:{marginBottom:14}},
        e('label', {style:T.label}, 'Usuário'),
        e('input', {value:username, onChange:ev=>setUsername(ev.target.value), placeholder:'nome.usuario', autoFocus:true,
          onKeyDown:ev=>{if(ev.key==='Enter'&&mode==='login')submit();}, style:T.input,
          onFocus:ev=>ev.target.style.borderColor=v('accent'), onBlur:ev=>ev.target.style.borderColor=v('border')}),
      ),
      e('div', {style:{marginBottom:18}},
        e('label', {style:T.label}, 'Senha'),
        e('input', {type:'password', value:password, onChange:ev=>setPassword(ev.target.value), placeholder:'••••••••',
          onKeyDown:ev=>{if(ev.key==='Enter')submit();}, style:T.input,
          onFocus:ev=>ev.target.style.borderColor=v('accent'), onBlur:ev=>ev.target.style.borderColor=v('border')}),
      ),

      err && e('div', {style:{marginBottom:14, padding:'10px 14px', background:v('red-dim'), border:`1px solid ${v('red')}40`, borderRadius:9, fontFamily:"var(--sans)", fontSize:12, color:v('red')}}, '⚠ '+err),

      e('button', {onClick:submit, disabled:loading,
        style:{...T.btnPrimary, opacity:loading?0.7:1, cursor:loading?'wait':'pointer'},
        onMouseEnter:ev=>{if(!loading) ev.currentTarget.style.transform='translateY(-1px)';},
        onMouseLeave:ev=>{ev.currentTarget.style.transform='translateY(0)';},
      }, loading ? 'Processando…' : (mode==='login' ? 'Entrar no Nexus IA  →' : 'Criar minha conta  →')),

      mode==='login' && e('div', {style:{marginTop:20, padding:'12px 15px', background:v('accent-dim'), border:`1px solid ${v('accent')}30`, borderRadius:10, fontFamily:"var(--sans)", fontSize:11.5, color:v('text-s'), lineHeight:1.8}},
        e('strong', {style:{color:v('accent')}}, 'Admin padrão: '),
        e('code', {style:{fontFamily:"var(--mono)", color:v('accent-l'), background:v('elevated'), padding:'2px 7px', borderRadius:5, fontSize:11}}, 'admin'),
        ' / ',
        e('code', {style:{fontFamily:"var(--mono)", color:v('accent-l'), background:v('elevated'), padding:'2px 7px', borderRadius:5, fontSize:11}}, 'admin123'),
        e('div', {style:{marginTop:6, fontSize:10.5, color:v('muted')}}, 'Recomenda-se trocar a senha após o primeiro acesso.'),
      ),

      e('div', {style:{marginTop:26, textAlign:'center', fontFamily:"var(--sans)", fontSize:10, color:v('faint'), letterSpacing:'0.6px'}}, 'Nexus IA · Assistente gerado com IA'),
    )
  );
}

// ── Avatar ────────────────────────────────────────────────────────
function Avatar({role, user}){
  if(role==='user' && user){
    const init = (user.name||user.username||'U').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
    return e('div', {style:{width:32, height:32, borderRadius:9, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, fontFamily:"var(--sans)", background:`linear-gradient(135deg, ${v('blue')}, ${v('blue-l')})`, color:'#fff', letterSpacing:'0.5px'}}, init);
  }
  return e('div', {style:{width:32, height:32, borderRadius:9, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"var(--display)", fontSize:17, fontWeight:700, background:`linear-gradient(135deg, ${v('accent-l')}, ${v('accent')}, ${v('accent-deep')})`, color:'#fff'}}, 'N');
}

// ── Tool Block ────────────────────────────────────────────────────
function ToolBlock({tool, done}){
  return e('div', {style:{background:v('elevated'), border:`1px solid ${done?v('green'):v('blue')}40`, borderLeft:`3px solid ${done?v('green'):v('blue')}`, borderRadius:9, padding:'10px 14px', margin:'8px 0', fontFamily:"var(--mono)", fontSize:11}},
    e('div', {style:{display:'flex', alignItems:'center', gap:8, marginBottom:done&&tool.args?6:0}},
      e('span', null, tool.icon||'⚙'),
      e('span', {style:{color:done?v('green'):v('blue'), fontWeight:600}}, tool.name),
      e('span', {style:{marginLeft:'auto', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:done?v('green'):v('muted')}}, done?'✓ concluído':'processando…'),
    ),
    tool.args && e('div', {style:{color:v('muted'), fontSize:10.5, lineHeight:1.6}, dangerouslySetInnerHTML:{__html: tool.args.replace(/<b>/g, `<b style="color:${v('accent')}">`)}}),
  );
}

// ── Message ───────────────────────────────────────────────────────
function Message({msg, user, onCopy}){
  const isAI = msg.role === 'assistant';
  const ts = fmtTime(msg.timestamp || Date.now());
  const [hover, setHover] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    try{ navigator.clipboard.writeText(msg.content); setCopied(true); setTimeout(()=>setCopied(false), 1800); }
    catch{}
  };

  return e('div', {
    onMouseEnter:()=>setHover(true), onMouseLeave:()=>setHover(false),
    style:{display:'flex', gap:11, marginBottom:24, flexDirection:isAI?'row':'row-reverse', animation:'fadeUp 0.3s ease', maxWidth:900, width:'100%', margin:'0 auto 24px', alignItems:'flex-start'}},
    e(Avatar, {role:isAI?'ai':'user', user}),
    e('div', {style:{maxWidth:'calc(100% - 48px)', minWidth:0, flex:'0 1 auto'}},
      e('div', {style:{display:'flex', alignItems:'center', gap:10, marginBottom:6, flexDirection:isAI?'row':'row-reverse'}},
        e('span', {style:{fontSize:12, fontWeight:700, color:isAI?v('accent'):v('blue'), fontFamily:"var(--sans)", letterSpacing:'0.2px'}}, isAI?'Nexus IA':user?.name||'Você'),
        e('span', {style:{fontSize:10.5, color:v('faint'), fontFamily:"var(--sans)"}}, ts),
        isAI && hover && e('button', {
          onClick:handleCopy,
          style:{background:'transparent', border:`1px solid ${v('border')}`, borderRadius:6, padding:'2px 8px', fontSize:10, color:copied?v('green'):v('muted'), cursor:'pointer', fontFamily:"var(--sans)", transition:'all 0.15s', marginLeft:'auto'},
        }, copied?'✓ copiado':'⎘ copiar'),
      ),
      msg.tools && msg.tools.map((t,i)=>e(ToolBlock, {key:i, tool:t, done:!!msg.toolsDone})),
      e('div', {style:{
        background:isAI ? v('msg-ai-bg') : v('msg-user-bg'),
        border:`1px solid ${isAI ? v('border') : v('blue')+'30'}`,
        borderRadius: isAI ? '3px 14px 14px 14px' : '14px 3px 14px 14px',
        padding:'13px 17px',
        boxShadow:`0 1px 3px ${v('shadow')}`,
        overflowWrap:'anywhere', wordBreak:'break-word',
      }},
        isAI ? e(Md, {content:msg.content||''}) : e('div', {style:{fontSize:14.5, lineHeight:1.7, color:v('text'), fontFamily:"var(--sans)", whiteSpace:'pre-wrap', wordBreak:'break-word'}}, msg.content),
      ),
      msg.savedDoc && e('div', {style:{marginTop:6, display:'flex', alignItems:'center', gap:6, padding:'5px 11px', background:v('green-dim'), border:`1px solid ${v('green')}40`, borderRadius:7}},
        e('span', {style:{fontSize:11, color:v('green'), fontWeight:700, fontFamily:"var(--sans)"}}, '▪ Salvo no Arquivo · ' + msg.savedDoc.name),
      ),
    )
  );
}

// ── Typing ────────────────────────────────────────────────────────
function Typing(){
  return e('div', {style:{display:'flex', gap:11, marginBottom:24, maxWidth:900, width:'100%', margin:'0 auto 24px'}},
    e(Avatar, {role:'ai'}),
    e('div', {style:{padding:'14px 18px', background:v('msg-ai-bg'), border:`1px solid ${v('border')}`, borderRadius:'3px 14px 14px 14px', display:'flex', alignItems:'center', gap:6}},
      [0, 0.2, 0.4].map((d,i)=>e('div', {key:i, style:{width:6, height:6, borderRadius:'50%', background:v('accent'), animation:`bounceDot 1.2s ease-in-out ${d}s infinite`}})),
    )
  );
}

// ── NavItem ───────────────────────────────────────────────────────
function NavItem({icon, label, active, onClick, badge}){
  const [hov, setHov] = useState(false);
  return e('div', {
    onClick, onMouseEnter:()=>setHov(true), onMouseLeave:()=>setHov(false),
    style:{
      display:'flex', alignItems:'center', gap:10, padding:'9px 11px', borderRadius:8,
      cursor:'pointer', marginBottom:1,
      background: active ? v('accent-dim') : hov ? v('elevated') : 'transparent',
      border:`1px solid ${active ? v('accent')+'40' : 'transparent'}`,
      color: active ? v('accent') : hov ? v('text') : v('muted'),
      fontSize:12.5, fontWeight: active?600:500, transition:'all 0.12s', fontFamily:"var(--sans)",
    }},
    e('span', {style:{fontSize:14, width:17, textAlign:'center', flexShrink:0}}, icon),
    e('span', {style:{flex:1}}, label),
    badge && e('span', {style:{fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:99, background:v('accent-dim'), color:v('accent')}}, badge),
  );
}

// ── Sidebar ───────────────────────────────────────────────────────
function Sidebar({user, convs, activeId, onSelect, onNew, onDelete, view, onView, onLogout, userCount, cloudStatus}){
  const isAdmin = user.role === 'admin';
  return e('div', {style:{width:248, minWidth:248, background:v('surface'), borderRight:`1px solid ${v('border')}`, display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden'}},

    // Brand
    e('div', {style:{padding:'20px 18px 15px', borderBottom:`1px solid ${v('border')}`}},
      e('div', {style:{fontFamily:"var(--display)", fontSize:24, fontWeight:700, color:v('accent'), letterSpacing:'-0.4px', lineHeight:1.1}}, 'Nexus IA'),
      e('div', {style:{fontFamily:"var(--sans)", fontSize:9.5, color:v('muted'), letterSpacing:'1.8px', textTransform:'uppercase', marginTop:4, fontWeight:500}}, 'Assistente Generativo'),
    ),

    // User info
    e('div', {style:{padding:'12px 15px', borderBottom:`1px solid ${v('border')}`, display:'flex', alignItems:'center', gap:10}},
      e(Avatar, {role:'user', user}),
      e('div', {style:{minWidth:0, flex:1}},
        e('div', {style:{fontSize:12.5, fontWeight:700, color:v('text'), fontFamily:"var(--sans)", overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}, user.name),
        e('div', {style:{fontSize:10, color: isAdmin?v('accent'):v('muted'), fontFamily:"var(--sans)", fontWeight:isAdmin?700:400, letterSpacing:'0.3px'}}, isAdmin?'👑 Administrador':user.username),
      ),
    ),

    // Nav
    e('div', {style:{padding:'12px 9px 4px'}},
      e('div', {style:{fontSize:9, fontWeight:700, color:v('faint'), letterSpacing:'1.8px', textTransform:'uppercase', padding:'0 9px 8px', fontFamily:"var(--sans)"}}, 'Navegação'),
      e(NavItem, {icon:'💬', label:'Chat', active:view==='chat', onClick:()=>onView('chat')}),
      e(NavItem, {icon:'▪', label:'Arquivo de Docs', active:view==='arquivo', onClick:()=>onView('arquivo')}),
      e(NavItem, {icon:'⚙', label:'Configurações', active:view==='settings', onClick:()=>onView('settings')}),
      isAdmin && e(NavItem, {icon:'👥', label:'Usuários', active:view==='admin', onClick:()=>onView('admin'), badge:userCount}),
    ),

    // New conv button
    e('div', {style:{padding:'0 9px 10px'}},
      e('button', {onClick:onNew,
        style:{
          width:'100%', padding:'11px', borderRadius:9, cursor:'pointer',
          background:`linear-gradient(135deg, ${v('accent-l')}, ${v('accent')}, ${v('accent-deep')})`,
          border:'none', color:'#fff', fontSize:12.5, fontWeight:700, fontFamily:"var(--sans)",
          transition:'all 0.18s', boxShadow:`0 6px 18px ${v('accent-glow')}`,
          display:'flex', alignItems:'center', justifyContent:'center', gap:7,
        },
        onMouseEnter:ev=>{ev.currentTarget.style.transform='translateY(-1px)'; ev.currentTarget.style.boxShadow=`0 10px 26px ${v('accent-glow')}`;},
        onMouseLeave:ev=>{ev.currentTarget.style.transform='translateY(0)'; ev.currentTarget.style.boxShadow=`0 6px 18px ${v('accent-glow')}`;},
      },
        e('span', {style:{fontSize:14}}, '✦'),
        'Nova conversa',
      ),
    ),

    // Conv list
    e('div', {style:{fontSize:9, fontWeight:700, color:v('faint'), letterSpacing:'1.8px', textTransform:'uppercase', padding:'4px 18px 6px', fontFamily:"var(--sans)"}}, 'Conversas'),
    e('div', {style:{flex:1, overflowY:'auto', padding:'0 9px'}},
      convs.length===0 ? e('div', {style:{padding:'24px 12px', textAlign:'center', fontSize:11.5, color:v('faint'), fontFamily:"var(--sans)", fontStyle:'italic'}}, 'Nenhuma conversa ainda') :
      convs.map(c => e('div', {
        key:c.id, onClick:()=>{onSelect(c.id); onView('chat');},
        style:{
          display:'flex', alignItems:'center', gap:7, padding:'8px 11px', borderRadius:8,
          cursor:'pointer', marginBottom:2,
          background: c.id===activeId ? v('accent-dim') : 'transparent',
          border:`1px solid ${c.id===activeId ? v('accent')+'30' : 'transparent'}`,
          transition:'all 0.12s',
        },
        onMouseEnter:ev=>{if(c.id!==activeId) ev.currentTarget.style.background=v('elevated');},
        onMouseLeave:ev=>{if(c.id!==activeId) ev.currentTarget.style.background='transparent';},
      },
        e('div', {style:{flex:1, minWidth:0, fontSize:11.5, fontWeight:c.id===activeId?600:500, color:c.id===activeId?v('accent'):v('text-s'), overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:"var(--sans)"}}, c.title),
        e('button', {onClick:ev=>{ev.stopPropagation(); onDelete(c.id);}, style:{background:'none', border:'none', color:v('faint'), cursor:'pointer', fontSize:14, padding:'0 3px', lineHeight:1, flexShrink:0}}, '×'),
      ))
    ),

    // Footer
    e('div', {style:{padding:'12px 9px 14px', borderTop:`1px solid ${v('border')}`, display:'flex', flexDirection:'column', gap:6}},
      e('div', {style:{display:'flex', alignItems:'center', gap:8, padding:'7px 11px', borderRadius:8, background:v('elevated'), border:`1px solid ${v('border')}`}},
        e('div', {style:{width:6, height:6, borderRadius:'50%',
          background: cloudStatus==='online'?v('green'):cloudStatus==='offline'?v('red'):v('accent'),
          boxShadow: cloudStatus==='online'?`0 0 8px ${v('green')}80`:cloudStatus==='offline'?`0 0 8px ${v('red')}80`:`0 0 8px ${v('accent')}80`,
          flexShrink:0, animation:'pulse 2s ease infinite'}}),
        e('span', {style:{fontSize:10.5, fontWeight:600, color:v('text'), fontFamily:"var(--sans)"}},
          cloudStatus==='online'?'☁ Sincronizado':cloudStatus==='offline'?'📵 Offline':'Conectando…'),
      ),
      e('button', {onClick:onLogout,
        style:{width:'100%', padding:'8px', borderRadius:8, cursor:'pointer', background:'transparent', border:`1px solid ${v('border')}`, color:v('muted'), fontSize:11, fontFamily:"var(--sans)", transition:'all 0.12s', fontWeight:500},
        onMouseEnter:ev=>{ev.currentTarget.style.borderColor=v('red'); ev.currentTarget.style.color=v('red');},
        onMouseLeave:ev=>{ev.currentTarget.style.borderColor=v('border'); ev.currentTarget.style.color=v('muted');},
      }, '↩ Sair'),
    )
  );
}

// ── Welcome ───────────────────────────────────────────────────────
function Welcome({user, onSuggest, mode}){
  const SUGS = {
    academic:['🎓 Elabore um resumo de dissertação em PLN','📅 Crie um cronograma de mestrado para 24 meses','🔬 Sugira metodologia para pesquisa em IA aplicada','📚 Formate esta referência segundo ABNT NBR 6023','🧐 Revisar texto acadêmico com normas ABNT','🎯 Simular banca examinadora de mestrado'],
    institutional:['📝 Gere um ofício institucional para parceria com a UFPB','📋 Briefing para reunião de orientação acadêmica','⚖ Parecer técnico sobre aquisição de equipamentos','📄 Memorando circular para servidores do setor','🏛 Ata de reunião de colegiado','✉ Email formal de resposta a solicitação'],
    research:['🔬 Esboce metodologia para estudo quantitativo','📊 Análise estatística: qual teste usar para dados pareados?','📑 Estrutura de artigo para revista Qualis A1','🧪 Desenho experimental para validar hipótese','📚 Revisão sistemática: protocolo PRISMA','🎯 Formulação de hipóteses e perguntas de pesquisa'],
    technical:['🏗 Inicie um projeto seguindo workflow estruturado','🧭 Explore a arquitetura de um sistema Next.js','📐 Projete 3 abordagens para uma feature de cache','🧹 Revise este código: bugs, DRY e convenções','🧪 Gere testes unitários com AAA pattern','💾 Mensagem de commit + PR description'],
    public:['⚖️ Análise de conformidade com Lei 14.133/2021','📊 Relatório de inventário patrimonial anual','🎯 Plano de ação para recolhimento de bens inservíveis','📄 Parecer sobre dispensa de licitação','📋 Briefing sobre Decreto 12.785/2025','🏛 Procedimento para movimentação de bens'],
    general:['📝 Gere um ofício institucional para parceria','🎓 Elabore um resumo de dissertação','💻 Ajude a projetar uma feature de autenticação','📊 Relatório técnico estruturado','🎯 Plano de ação com prazos e KPIs','⚖ Análise crítica com recomendações'],
  };
  const MODE_TITLE = {academic:'Acadêmico', institutional:'Institucional', research:'Pesquisa', technical:'Técnico', public:'Pública', general:'Geral'};
  const sugs = SUGS[mode] || SUGS.general;
  const firstName = (user.name||'').split(' ')[0];

  return e('div', {style:{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'70vh', textAlign:'center', padding:'2rem', animation:'fadeIn 0.5s ease'}},
    e('div', {style:{fontFamily:"var(--display)", fontSize:64, fontWeight:700, color:v('accent'), letterSpacing:'-1.6px', lineHeight:1, marginBottom:12, animation:'float 4s ease infinite'}}, 'Nexus IA'),
    e('p', {style:{color:v('text'), fontSize:18, marginBottom:6, fontFamily:"var(--display)", fontWeight:500, fontStyle:'italic', letterSpacing:'-0.2px'}}, `Olá, ${firstName}.`),
    e('p', {style:{color:v('text-s'), fontSize:14, marginBottom:6, fontFamily:"var(--sans)"}}, 'O que você precisa hoje?'),
    e('div', {style:{display:'inline-flex', alignItems:'center', gap:7, padding:'4px 14px', borderRadius:99, background:v('accent-dim'), border:`1px solid ${v('accent')}30`, marginBottom:22, marginTop:4}},
      e('span', {style:{width:6, height:6, borderRadius:'50%', background:v('accent'), animation:'pulse 2s infinite'}}),
      e('span', {style:{fontSize:10, color:v('accent'), fontFamily:"var(--sans)", fontWeight:700, letterSpacing:'1.2px', textTransform:'uppercase'}}, 'Modo '+(MODE_TITLE[mode]||'Geral')),
    ),
    e('p', {style:{color:v('faint'), fontSize:11.5, marginBottom:34, fontFamily:"var(--sans)", letterSpacing:'0.6px'}}, 'Digite / para ver os comandos disponíveis'),
    e('div', {style:{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(230px, 1fr))', gap:11, width:'100%', maxWidth:740}},
      sugs.map((t,i) => e('div', {key:i, onClick:()=>onSuggest(t),
        style:{padding:'15px 17px', borderRadius:12, border:`1px solid ${v('border')}`, background:v('card'), color:v('text-s'), fontSize:13, textAlign:'left', lineHeight:1.55, fontFamily:"var(--sans)", cursor:'pointer', transition:'all 0.2s', boxShadow:`0 1px 3px ${v('shadow')}`},
        onMouseEnter:ev=>{ev.currentTarget.style.borderColor=v('accent'); ev.currentTarget.style.color=v('text'); ev.currentTarget.style.background=v('accent-dim'); ev.currentTarget.style.transform='translateY(-2px)'; ev.currentTarget.style.boxShadow=`0 8px 20px ${v('shadow')}`;},
        onMouseLeave:ev=>{ev.currentTarget.style.borderColor=v('border'); ev.currentTarget.style.color=v('text-s'); ev.currentTarget.style.background=v('card'); ev.currentTarget.style.transform='translateY(0)'; ev.currentTarget.style.boxShadow=`0 1px 3px ${v('shadow')}`;}
      }, t))
    )
  );
}

// ── Chat View ─────────────────────────────────────────────────────
function ChatView({user, conv, cfg, onSend, loading, onClear, theme, onChangeTheme}){
  const [input, setInput] = useState('');
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashFiltered, setSlashFiltered] = useState([]);
  const [slashIdx, setSlashIdx] = useState(0);
  const bottomRef = useRef(null);
  const textRef = useRef(null);

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'});}, [conv?.messages?.length, loading]);

  const send = (txt) => {
    const t = (txt||input).trim();
    if(!t||loading) return;
    setInput(''); if(textRef.current) textRef.current.style.height='auto';
    setSlashOpen(false); onSend(t);
  };

  const handleInput = ev => {
    const val = ev.target.value;
    setInput(val);
    ev.target.style.height='auto';
    ev.target.style.height=Math.min(ev.target.scrollHeight,180)+'px';
    if(val.startsWith('/')){
      const f = SLASH_COMMANDS.filter(c=>c.cmd.startsWith(val.toLowerCase()));
      if(f.length){setSlashFiltered(f); setSlashOpen(true); setSlashIdx(0); return;}
    }
    setSlashOpen(false);
  };

  const handleKey = ev => {
    if(slashOpen){
      if(ev.key==='ArrowDown'){ev.preventDefault(); setSlashIdx(i=>Math.min(i+1, slashFiltered.length-1)); return;}
      if(ev.key==='ArrowUp'){ev.preventDefault(); setSlashIdx(i=>Math.max(i-1, 0)); return;}
      if(ev.key==='Tab'||ev.key==='Enter'){ev.preventDefault(); selSlash(slashFiltered[slashIdx].cmd); return;}
      if(ev.key==='Escape'){setSlashOpen(false); return;}
    }
    if(ev.key==='Enter' && !ev.shiftKey){ev.preventDefault(); send();}
  };

  const selSlash = cmd => {setInput(cmd+' '); setSlashOpen(false); textRef.current?.focus();};
  const modelInfo = MODELS.find(m=>m.id===cfg.model);
  const hasKey = !!cfg.apiKey;
  const estTokens = Math.round((conv?.messages||[]).reduce((s,m)=>s+(m.content||'').length, 0) / 4);

  return e('div', {style:{flex:1, display:'flex', flexDirection:'column', overflow:'hidden', height:'100vh'}},

    // Topbar
    e('div', {style:{height:54, flexShrink:0, background:v('surface'), borderBottom:`1px solid ${v('border')}`, display:'flex', alignItems:'center', padding:'0 22px', gap:13, backdropFilter:'blur(8px)'}},
      e('div', {style:{flex:1, fontSize:14, fontWeight:600, color:v('text'), fontFamily:"var(--sans)", overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}, conv?.title||'Nova conversa'),
      modelInfo && e('div', {style:{fontFamily:"var(--mono)", fontSize:10, color:v('muted'), background:v('elevated'), border:`1px solid ${v('border')}`, borderRadius:6, padding:'4px 10px', flexShrink:0, fontWeight:500}}, modelInfo.label.split('—')[0].trim()),
      e(ThemeSwitcher, {currentTheme:theme, onChange:onChangeTheme, compact:true}),
      e('button', {onClick:onClear,
        style:{background:'transparent', border:`1px solid ${v('border')}`, color:v('muted'), borderRadius:7, padding:'5px 12px', fontSize:11, cursor:'pointer', transition:'all 0.15s', fontFamily:"var(--sans)", fontWeight:500},
        onMouseEnter:ev=>{ev.currentTarget.style.borderColor=v('red'); ev.currentTarget.style.color=v('red');},
        onMouseLeave:ev=>{ev.currentTarget.style.borderColor=v('border'); ev.currentTarget.style.color=v('muted');}
      }, '🗑 Limpar'),
    ),

    // Context bar
    e('div', {style:{padding:'6px 22px', borderBottom:`1px solid ${v('border')}`, background:v('elevated'), display:'flex', alignItems:'center', gap:8, fontSize:10, color:v('muted'), overflowX:'auto', flexShrink:0, fontFamily:"var(--mono)"}},
      e('span', {style:{color:v('faint'), fontWeight:600}}, 'ctx'),
      ...[`~${estTokens}t`, cfg.mode||'general', 'groq'].map((t,i) =>
        e('span', {key:i, style:{background:v('card'), border:`1px solid ${i===2?v('green')+'40':i===1?v('accent')+'40':v('border')}`, borderRadius:5, padding:'2px 9px', color:i===2?v('green'):i===1?v('accent'):v('muted'), whiteSpace:'nowrap', fontWeight:500}}, t)),
    ),

    // Messages
    e('div', {style:{flex:1, overflowY:'auto', padding:'24px 22px'}},
      !conv || conv.messages.length===0 ? e(Welcome, {user, onSuggest:t=>send(t), mode:cfg.mode||'general'}) :
        e(React.Fragment, null,
          ...conv.messages.map(m => e(Message, {key:m.id, msg:m, user})),
          loading ? e(Typing) : null,
        ),
      e('div', {ref:bottomRef}),
    ),

    // Input
    e('div', {style:{flexShrink:0, borderTop:`1px solid ${v('border')}`, background:v('surface'), padding:'14px 22px 16px'}},
      e('div', {style:{maxWidth:900, margin:'0 auto'}},
        !hasKey && e('div', {style:{marginBottom:12, padding:'10px 15px', background:v('accent-dim'), border:`1px solid ${v('accent')}40`, borderRadius:9, fontSize:12.5, color:v('accent'), fontFamily:"var(--sans)", fontWeight:500}}, '⚠ Configure sua Groq API Key em Configurações para começar'),

        // Slash menu
        slashOpen && e('div', {style:{background:v('card'), border:`1px solid ${v('border')}`, borderRadius:11, padding:6, marginBottom:8, boxShadow:`0 12px 32px ${v('shadow')}`, maxHeight:320, overflowY:'auto'}},
          (() => {
            const byCat = {};
            slashFiltered.forEach((c,i)=>{const k=c.cat||'outros'; (byCat[k]=byCat[k]||[]).push({...c, __idx:i});});
            const order = ['sistema','acadêmico','técnico','profissional','outros'];
            const labels = {sistema:'Sistema', acadêmico:'Acadêmico', técnico:'Técnico / Código', profissional:'Profissional', outros:'Outros'};
            const out = [];
            order.forEach(k=>{
              if(!byCat[k]) return;
              out.push(e('div', {key:'h_'+k, style:{fontSize:9, fontWeight:700, color:v('faint'), letterSpacing:'1.5px', textTransform:'uppercase', padding:'8px 11px 4px', fontFamily:"var(--sans)"}}, labels[k]));
              byCat[k].forEach(c=>out.push(
                e('div', {key:c.cmd, onClick:()=>selSlash(c.cmd),
                  style:{padding:'8px 13px', borderRadius:8, display:'flex', alignItems:'center', gap:11, cursor:'pointer', background:c.__idx===slashIdx?v('accent-dim'):'transparent', transition:'background 0.1s'},
                  onMouseEnter:()=>setSlashIdx(c.__idx)},
                  e('span', {style:{fontSize:14}}, c.icon),
                  e('span', {style:{fontFamily:"var(--mono)", fontSize:11.5, fontWeight:500, color:v('accent'), minWidth:150}}, c.cmd),
                  e('span', {style:{fontSize:11.5, color:v('text-s'), fontFamily:"var(--sans)"}}, c.desc),
                )
              ));
            });
            return out;
          })()
        ),

        // Input row
        e('div', {style:{display:'flex', gap:9, alignItems:'flex-end'}},
          e('div', {style:{flex:1, background:v('card'), border:`1px solid ${v('border')}`, borderRadius:12, display:'flex', flexDirection:'column', overflow:'hidden', transition:'border-color 0.2s, box-shadow 0.2s'},
            onFocusCapture:ev=>{ev.currentTarget.style.borderColor=v('accent'); ev.currentTarget.style.boxShadow=`0 0 0 3px ${v('accent-dim')}`;},
            onBlurCapture:ev=>{ev.currentTarget.style.borderColor=v('border'); ev.currentTarget.style.boxShadow='none';}},
            e('textarea', {ref:textRef, value:input, onChange:handleInput, onKeyDown:handleKey,
              placeholder:hasKey?'Mensagem… (/ para comandos, Enter para enviar)':'Configure sua API Key primeiro…',
              disabled:!hasKey||loading, rows:1,
              style:{width:'100%', background:'transparent', border:'none', outline:'none', color:v('text'), fontSize:14.5, lineHeight:1.65, resize:'none', padding:'12px 15px', maxHeight:180, fontFamily:"var(--sans)"}}),
            e('div', {style:{padding:'3px 14px 8px', display:'flex', alignItems:'center', gap:6}},
              e('span', {style:{fontSize:10, color:v('faint'), fontFamily:"var(--sans)"}},
                e('kbd', {style:{background:v('elevated'), border:`1px solid ${v('border')}`, borderRadius:4, padding:'1px 6px', fontSize:9.5, fontFamily:"var(--mono)"}}, 'Enter'), ' enviar · ',
                e('kbd', {style:{background:v('elevated'), border:`1px solid ${v('border')}`, borderRadius:4, padding:'1px 6px', fontSize:9.5, fontFamily:"var(--mono)"}}, 'Shift+Enter'), ' nova linha'),
              e('span', {style:{marginLeft:'auto', fontSize:10, color:v('faint'), fontFamily:"var(--mono)"}}, input.length),
            ),
          ),
          e('button', {onClick:()=>send(), disabled:!hasKey||loading||!input.trim(),
            style:{width:44, height:44, flexShrink:0, borderRadius:10, border:'none',
              cursor:(hasKey&&!loading&&input.trim())?'pointer':'not-allowed',
              background:(hasKey&&!loading&&input.trim())?`linear-gradient(135deg, ${v('accent-l')}, ${v('accent')}, ${v('accent-deep')})`:v('elevated'),
              color:(hasKey&&!loading&&input.trim())?'#fff':v('faint'),
              fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.18s',
              boxShadow:(hasKey&&!loading&&input.trim())?`0 6px 18px ${v('accent-glow')}`:'none'},
            onMouseEnter:ev=>{if(hasKey&&!loading&&input.trim()){ev.currentTarget.style.transform='scale(1.05)';}},
            onMouseLeave:ev=>{ev.currentTarget.style.transform='scale(1)';},
          }, loading ? e('span', {style:{width:14, height:14, border:'2.5px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite'}}) : '↑'),
        ),
      )
    )
  );
}

// ── Arquivo ───────────────────────────────────────────────────────
function ArquivoView({docs, onDelete, onDownload}){
  const [filter, setFilter] = useState('todos');
  const [query, setQuery] = useState('');
  const filtered = docs.filter(d=>{
    const mt = filter==='todos'||d.type===filter;
    return mt && (!query || d.name.toLowerCase().includes(query.toLowerCase()));
  });
  const filters = [['todos','Todos'], ['relatorio','Relatórios'], ['analise','Análises'], ['rascunho','Rascunhos']];
  return e('div', {style:{flex:1, overflowY:'auto', padding:28}},
    e('div', {style:{marginBottom:24}},
      e('div', {style:{fontFamily:"var(--display)", fontSize:32, fontWeight:700, color:v('text'), marginBottom:5, letterSpacing:'-0.6px'}}, 'Arquivo de Documentos'),
      e('div', {style:{fontSize:13, color:v('text-s'), fontFamily:"var(--sans)"}}, `${docs.length} documento${docs.length!==1?'s':''} gerados pela IA`),
    ),
    e('div', {style:{display:'flex', gap:9, marginBottom:18, flexWrap:'wrap', alignItems:'center'}},
      e('input', {value:query, onChange:ev=>setQuery(ev.target.value), placeholder:'🔍 Buscar documento…',
        style:{...T.input, flex:1, minWidth:220, padding:'9px 14px', fontSize:13}}),
      ...filters.map(([f,l]) => e('button', {key:f, onClick:()=>setFilter(f),
        style:{padding:'8px 16px', borderRadius:8, cursor:'pointer', border:`1px solid ${filter===f?v('accent')+'60':v('border')}`, background:filter===f?v('accent-dim'):v('card'), color:filter===f?v('accent'):v('text-s'), fontSize:11.5, fontWeight:600, fontFamily:"var(--sans)", transition:'all 0.15s'}}, l)),
    ),
    filtered.length===0 ? e('div', {style:{textAlign:'center', padding:'72px 0', color:v('text-s'), fontFamily:"var(--sans)"}},
      e('div', {style:{fontSize:48, marginBottom:16, opacity:0.4}}, '▪'),
      e('div', {style:{fontSize:17, fontWeight:600, color:v('text'), marginBottom:7, fontFamily:"var(--display)"}}, 'Nenhum documento ainda'),
      e('div', {style:{fontSize:13, lineHeight:1.7, maxWidth:380, margin:'0 auto', color:v('muted')}}, 'Respostas longas da IA são salvas aqui automaticamente como documentos.'),
    ) : e('div', {style:{background:v('card'), border:`1px solid ${v('border')}`, borderRadius:14, overflow:'hidden', boxShadow:`0 1px 4px ${v('shadow')}`}},
      e('div', {style:{display:'grid', gridTemplateColumns:'2fr 1fr 90px 100px 80px', padding:'11px 20px', borderBottom:`1px solid ${v('border')}`, background:v('elevated'), fontSize:9, fontWeight:700, color:v('faint'), textTransform:'uppercase', letterSpacing:'1.2px', fontFamily:"var(--sans)"}},
        e('span', null, 'Nome'), e('span', null, 'Data'), e('span', null, 'Hora'), e('span', null, 'Tipo'), e('span', null, 'Ações'),
      ),
      filtered.map((d,i) => {
        const m = TYPE_META[d.type] || TYPE_META.analise;
        return e('div', {key:d.id, style:{display:'grid', gridTemplateColumns:'2fr 1fr 90px 100px 80px', alignItems:'center', padding:'13px 20px', borderBottom:i<filtered.length-1?`1px solid ${v('border')}`:'none', transition:'background 0.12s'},
          onMouseEnter:ev=>ev.currentTarget.style.background=v('accent-dim'),
          onMouseLeave:ev=>ev.currentTarget.style.background='transparent'},
          e('div', {style:{display:'flex', alignItems:'center', gap:11, minWidth:0}},
            e('span', {style:{fontSize:16, flexShrink:0}}, m.icon),
            e('span', {style:{fontSize:13, fontWeight:600, color:v('text'), overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:"var(--sans)"}}, d.name),
          ),
          e('span', {style:{fontSize:12, color:v('text-s'), fontFamily:"var(--sans)"}}, fmtDate(d.createdAt)),
          e('span', {style:{fontFamily:"var(--display)", fontSize:15, fontWeight:600, color:v('text')}}, fmtTime(d.createdAt)),
          e('span', {style:{fontSize:10.5, fontWeight:700, fontFamily:"var(--sans)", padding:'3px 10px', borderRadius:6, background:v('accent-dim'), color:v('accent'), display:'inline-block', width:'fit-content'}}, m.label),
          e('div', {style:{display:'flex', gap:5}},
            e('button', {onClick:()=>onDownload(d), title:'Baixar', style:{background:'none', border:'none', color:v('muted'), cursor:'pointer', fontSize:15, padding:'4px 8px', borderRadius:6, transition:'all 0.12s'}, onMouseEnter:ev=>{ev.currentTarget.style.color=v('accent'); ev.currentTarget.style.background=v('accent-dim');}, onMouseLeave:ev=>{ev.currentTarget.style.color=v('muted'); ev.currentTarget.style.background='transparent';}}, '⬇'),
            e('button', {onClick:()=>{if(confirm(`Excluir "${d.name}"?`)) onDelete(d.id);}, title:'Excluir', style:{background:'none', border:'none', color:v('muted'), cursor:'pointer', fontSize:15, padding:'4px 8px', borderRadius:6, transition:'all 0.12s'}, onMouseEnter:ev=>{ev.currentTarget.style.color=v('red'); ev.currentTarget.style.background=v('red-dim');}, onMouseLeave:ev=>{ev.currentTarget.style.color=v('muted'); ev.currentTarget.style.background='transparent';}}, '🗑'),
          ),
        );
      })
    )
  );
}

// ── Settings ──────────────────────────────────────────────────────
function SettingsView({user, cfg, onSave, onUpdateUser, theme, onChangeTheme}){
  const [apiKey, setApiKey] = useState(cfg.apiKey||'');
  const [model, setModel] = useState(cfg.model||DEFAULT_MODEL);
  const [mode, setMode] = useState(cfg.mode||'academic');
  const [sys, setSys] = useState(cfg.systemPrompt||'');
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [saved, setSaved] = useState(false);
  const [passErr, setPassErr] = useState('');
  const [passOk, setPassOk] = useState(false);

  const doSave = () => {
    onSave({...cfg, apiKey, model, mode, systemPrompt:sys});
    if(name!==user.name||email!==user.email) onUpdateUser({...user, name, email});
    setSaved(true); setTimeout(()=>setSaved(false), 2000);
  };

  const changePass = () => {
    setPassErr(''); setPassOk(false);
    if(!oldPass||!newPass){setPassErr('Preencha as duas senhas.'); return;}
    if(simpleHash(oldPass)!==user.passwordHash){setPassErr('Senha atual incorreta.'); return;}
    if(newPass.length<6){setPassErr('Mínimo 6 caracteres.'); return;}
    onUpdateUser({...user, passwordHash:simpleHash(newPass)});
    setOldPass(''); setNewPass(''); setPassOk(true);
    setTimeout(()=>setPassOk(false), 2500);
  };

  return e('div', {style:{flex:1, overflowY:'auto', padding:28, maxWidth:720}},
    e('div', {style:{marginBottom:28}},
      e('div', {style:{fontFamily:"var(--display)", fontSize:32, fontWeight:700, color:v('text'), marginBottom:5, letterSpacing:'-0.6px'}}, 'Configurações'),
      e('div', {style:{fontSize:13, color:v('text-s'), fontFamily:"var(--sans)"}}, 'Personalize sua experiência no Nexus IA'),
    ),

    // Aparência
    e('div', {style:T.sectionCard},
      e('div', {style:T.sectionTitle}, e('span', null, '🎨'), 'Aparência'),
      e('label', {style:T.label}, 'Tema visual'),
      e('div', {style:{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px, 1fr))', gap:10, marginTop:4}},
        THEMES.map(t => e('div', {key:t.id, onClick:()=>onChangeTheme(t.id),
          style:{padding:'14px 15px', borderRadius:11, cursor:'pointer', border:`2px solid ${theme===t.id?v('accent'):v('border')}`, background:theme===t.id?v('accent-dim'):v('elevated'), transition:'all 0.18s', display:'flex', alignItems:'center', gap:12}},
          e('div', {style:{width:38, height:38, borderRadius:9, background:t.bg, border:`2px solid ${t.accent}`, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17}}, t.icon),
          e('div', {style:{flex:1, minWidth:0}},
            e('div', {style:{fontSize:13, fontWeight:700, color:theme===t.id?v('accent'):v('text'), fontFamily:"var(--sans)"}}, t.name),
            e('div', {style:{fontSize:10.5, color:v('muted'), fontFamily:"var(--sans)"}}, t.desc),
          ),
          theme===t.id && e('span', {style:{color:v('accent'), fontSize:15}}, '✓'),
        ))
      ),
    ),

    // AI
    e('div', {style:T.sectionCard},
      e('div', {style:T.sectionTitle}, e('span', null, '🤖'), 'Inteligência Artificial'),
      e('div', {style:{marginBottom:15}},
        e('label', {style:T.label}, 'Groq API Key'),
        e('input', {type:'password', value:apiKey, onChange:ev=>setApiKey(ev.target.value), placeholder:'gsk_…', style:{...T.input, borderColor:apiKey?v('green')+'70':v('border')}}),
        e('div', {style:{fontSize:11.5, color:v('muted'), marginTop:6, fontFamily:"var(--sans)"}}, 'Gratuito em ', e('a', {href:'https://console.groq.com', target:'_blank', rel:'noopener', style:{color:v('accent'), textDecoration:'underline'}}, 'console.groq.com')),
      ),
      e('div', {style:{marginBottom:15}},
        e('label', {style:T.label}, 'Modelo de IA'),
        e('select', {value:model, onChange:ev=>setModel(ev.target.value), style:{...T.input, cursor:'pointer'}},
          MODELS.map(m=>e('option', {key:m.id, value:m.id}, m.label))),
      ),
      e('div', {style:{marginBottom:15}},
        e('label', {style:T.label}, 'Modo do Assistente'),
        e('select', {value:mode, onChange:ev=>setMode(ev.target.value), style:{...T.input, cursor:'pointer'}},
          e('option', {value:'academic'}, '🎓 Acadêmico — dissertações, ABNT'),
          e('option', {value:'institutional'}, '🏛 Institucional — ofícios, documentos'),
          e('option', {value:'research'}, '🔬 Pesquisa — metodologia, artigos'),
          e('option', {value:'technical'}, '💻 Técnico — código, arquitetura'),
          e('option', {value:'public'}, '⚖️ Pública — Lei 14.133, CGU/TCU'),
          e('option', {value:'general'}, '💬 Geral — uso livre'),
        ),
      ),
      e('div', null,
        e('label', {style:T.label}, 'Prompt do Sistema (opcional)'),
        e('textarea', {value:sys, onChange:ev=>setSys(ev.target.value), placeholder:'Personalize o comportamento da IA…', rows:3, style:{...T.input, resize:'vertical', lineHeight:1.6}}),
      ),
    ),

    // Profile
    e('div', {style:T.sectionCard},
      e('div', {style:T.sectionTitle}, e('span', null, '👤'), 'Meu Perfil'),
      e('div', {style:{display:'grid', gridTemplateColumns:'1fr 1fr', gap:13, marginBottom:11}},
        e('div', null, e('label', {style:T.label}, 'Nome'), e('input', {value:name, onChange:ev=>setName(ev.target.value), style:T.input})),
        e('div', null, e('label', {style:T.label}, 'Email'), e('input', {type:'email', value:email, onChange:ev=>setEmail(ev.target.value), style:T.input})),
      ),
      e('div', {style:{fontSize:11.5, color:v('text-s'), fontFamily:"var(--sans)"}}, 'Usuário: ',
        e('code', {style:{fontFamily:"var(--mono)", color:v('accent'), background:v('elevated'), padding:'2px 8px', borderRadius:5}}, user.username),
        user.role==='admin' && e('span', {style:{marginLeft:9, padding:'2px 8px', borderRadius:99, background:v('accent-dim'), color:v('accent'), fontSize:9.5, fontWeight:700, fontFamily:"var(--sans)"}}, 'ADMIN'),
      ),
    ),

    // Password
    e('div', {style:T.sectionCard},
      e('div', {style:T.sectionTitle}, e('span', null, '🔑'), 'Alterar Senha'),
      e('div', {style:{display:'grid', gridTemplateColumns:'1fr 1fr', gap:13, marginBottom:13}},
        e('div', null, e('label', {style:T.label}, 'Senha atual'), e('input', {type:'password', value:oldPass, onChange:ev=>setOldPass(ev.target.value), placeholder:'••••••••', style:T.input})),
        e('div', null, e('label', {style:T.label}, 'Nova senha'), e('input', {type:'password', value:newPass, onChange:ev=>setNewPass(ev.target.value), placeholder:'mínimo 6 caracteres', style:T.input})),
      ),
      passErr && e('div', {style:{padding:'8px 13px', background:v('red-dim'), border:`1px solid ${v('red')}40`, borderRadius:8, fontSize:11.5, color:v('red'), marginBottom:11, fontFamily:"var(--sans)"}}, '⚠ '+passErr),
      passOk && e('div', {style:{padding:'8px 13px', background:v('green-dim'), border:`1px solid ${v('green')}40`, borderRadius:8, fontSize:11.5, color:v('green'), marginBottom:11, fontFamily:"var(--sans)"}}, '✓ Senha alterada.'),
      e('button', {onClick:changePass,
        style:{padding:'10px 22px', borderRadius:9, border:`1px solid ${v('border')}`, cursor:'pointer', background:v('elevated'), color:v('text'), fontSize:12.5, fontWeight:600, fontFamily:"var(--sans)", transition:'all 0.15s'},
        onMouseEnter:ev=>{ev.currentTarget.style.borderColor=v('accent'); ev.currentTarget.style.color=v('accent');},
        onMouseLeave:ev=>{ev.currentTarget.style.borderColor=v('border'); ev.currentTarget.style.color=v('text');}
      }, 'Alterar senha'),
    ),

    e('button', {onClick:doSave,
      style:{...T.btnPrimary, width:'auto', padding:'13px 42px', background:saved?v('green'):`linear-gradient(135deg, ${v('accent-l')}, ${v('accent')}, ${v('accent-deep')})`, boxShadow:saved?'none':`0 8px 24px ${v('accent-glow')}`}},
      saved?'✓ Salvo com sucesso':'Salvar configurações'),
  );
}

// ── Admin View ────────────────────────────────────────────────────
function AdminView({currentUser, onUpdate}){
  const [users, setUsers] = useState(()=>ld(K_USERS, []));
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState('todos');
  const [query, setQuery] = useState('');
  const [nU, setNU] = useState({username:'', name:'', email:'', password:'', role:'user'});
  const [nErr, setNErr] = useState('');

  const tog = (id, field) => {
    if(id===currentUser.id) return;
    const u = users.map(x => x.id===id ? {...x, [field]: field==='active' ? !x.active : x.role==='admin'?'user':'admin'} : x);
    sv(K_USERS, u); setUsers(u);
    const changed = u.find(x=>x.id===id);
    if(changed) cloudSaveUser(changed);
  };
  const del = id => {
    if(id===currentUser.id || !confirm('Excluir este usuário?')) return;
    const u = users.filter(x=>x.id!==id);
    sv(K_USERS, u); setUsers(u);
    cloudDeleteUser(id);
  };
  const resetPw = id => {
    const p = prompt('Nova senha (mín. 6):');
    if(!p || p.length<6) return;
    const u = users.map(x=>x.id===id?{...x, passwordHash:simpleHash(p)}:x);
    sv(K_USERS, u); setUsers(u);
    const changed = u.find(x=>x.id===id);
    if(changed) cloudSaveUser(changed);
    alert('Senha redefinida.');
  };
  const create = () => {
    setNErr('');
    if(!nU.username||!nU.name||!nU.email||!nU.password){setNErr('Preencha todos os campos.'); return;}
    if(nU.password.length<6){setNErr('Mínimo 6 caracteres.'); return;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nU.email)){setNErr('Email inválido.'); return;}
    if(users.some(x=>x.username===nU.username.trim().toLowerCase())){setNErr('Usuário já existe.'); return;}
    const nu = {id:uid(), username:nU.username.trim().toLowerCase(), name:nU.name.trim(), email:nU.email.trim().toLowerCase(), passwordHash:simpleHash(nU.password), role:nU.role, createdAt:Date.now(), lastLogin:null, active:true};
    const u = [...users, nu];
    sv(K_USERS, u); setUsers(u);
    cloudSaveUser(nu);
    setNU({username:'', name:'', email:'', password:'', role:'user'}); setShowNew(false);
  };

  const filtered = users.filter(u=>{
    const mt = filter==='todos' || (filter==='admin'&&u.role==='admin') || (filter==='user'&&u.role==='user') || (filter==='inativos'&&!u.active);
    return mt && (!query || u.username.includes(query.toLowerCase()) || u.name.toLowerCase().includes(query.toLowerCase()) || u.email.includes(query.toLowerCase()));
  });
  const stats = {total:users.length, admins:users.filter(u=>u.role==='admin').length, active:users.filter(u=>u.active).length};

  return e('div', {style:{flex:1, overflowY:'auto', padding:28}},
    e('div', {style:{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:22, flexWrap:'wrap', gap:13}},
      e('div', null,
        e('div', {style:{fontFamily:"var(--display)", fontSize:32, fontWeight:700, color:v('text'), marginBottom:3, letterSpacing:'-0.6px'}}, 'Gerenciar Usuários'),
        e('div', {style:{fontSize:13, color:v('text-s'), fontFamily:"var(--sans)"}}, 'Cadastre, edite e controle acessos'),
      ),
      e('button', {onClick:()=>setShowNew(!showNew),
        style:{padding:'10px 20px', borderRadius:9, border:'none', cursor:'pointer', background:showNew?v('elevated'):`linear-gradient(135deg, ${v('accent-l')}, ${v('accent')}, ${v('accent-deep')})`, color:showNew?v('muted'):'#fff', fontSize:12.5, fontWeight:700, fontFamily:"var(--sans)", transition:'all 0.15s', boxShadow:showNew?'none':`0 6px 18px ${v('accent-glow')}`}},
        showNew ? '✕ Cancelar' : '+ Novo usuário'),
    ),

    // Stats
    e('div', {style:{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:11, marginBottom:22}},
      [{l:'Total', v:stats.total, c:v('accent')}, {l:'Admins', v:stats.admins, c:v('purple')}, {l:'Ativos', v:stats.active, c:v('green')}, {l:'Inativos', v:users.length-stats.active, c:v('muted')}]
        .map((s,i)=>e('div', {key:i, style:{background:v('card'), border:`1px solid ${v('border')}`, borderRadius:11, padding:'14px 18px', boxShadow:`0 1px 3px ${v('shadow')}`}},
          e('div', {style:{fontSize:9.5, color:v('muted'), fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', fontFamily:"var(--sans)", marginBottom:5}}, s.l),
          e('div', {style:{fontFamily:"var(--display)", fontSize:32, fontWeight:700, color:s.c}}, s.v),
        )),
    ),

    // New user form
    showNew && e('div', {style:{background:v('card'), border:`1.5px solid ${v('accent')}60`, borderRadius:14, padding:22, marginBottom:22, animation:'fadeUp 0.2s ease', boxShadow:`0 8px 24px ${v('accent-glow')}`}},
      e('div', {style:{fontFamily:"var(--display)", fontSize:19, fontWeight:700, color:v('accent'), marginBottom:16}}, 'Cadastrar novo usuário'),
      e('div', {style:{display:'grid', gridTemplateColumns:'1fr 1fr', gap:13, marginBottom:13}},
        e('div', null, e('label', {style:T.label}, 'Nome'), e('input', {value:nU.name, onChange:ev=>setNU({...nU, name:ev.target.value}), style:T.input})),
        e('div', null, e('label', {style:T.label}, 'Email'), e('input', {type:'email', value:nU.email, onChange:ev=>setNU({...nU, email:ev.target.value}), style:T.input})),
        e('div', null, e('label', {style:T.label}, 'Usuário'), e('input', {value:nU.username, onChange:ev=>setNU({...nU, username:ev.target.value}), style:T.input})),
        e('div', null, e('label', {style:T.label}, 'Senha'), e('input', {type:'text', value:nU.password, onChange:ev=>setNU({...nU, password:ev.target.value}), style:T.input, placeholder:'mín. 6'})),
        e('div', {style:{gridColumn:'span 2'}}, e('label', {style:T.label}, 'Papel'), e('select', {value:nU.role, onChange:ev=>setNU({...nU, role:ev.target.value}), style:{...T.input, cursor:'pointer'}}, e('option', {value:'user'}, 'Usuário comum'), e('option', {value:'admin'}, 'Administrador'))),
      ),
      nErr && e('div', {style:{padding:'8px 13px', background:v('red-dim'), border:`1px solid ${v('red')}40`, borderRadius:8, fontSize:11.5, color:v('red'), marginBottom:11, fontFamily:"var(--sans)"}}, '⚠ '+nErr),
      e('button', {onClick:create, style:{...T.btnPrimary, width:'auto', padding:'10px 26px'}}, 'Cadastrar usuário'),
    ),

    // Filters
    e('div', {style:{display:'flex', gap:8, marginBottom:15, flexWrap:'wrap', alignItems:'center'}},
      e('input', {value:query, onChange:ev=>setQuery(ev.target.value), placeholder:'🔍 Buscar usuário…', style:{...T.input, flex:1, minWidth:220, padding:'8px 13px', fontSize:12.5}}),
      ...[['todos','Todos'], ['admin','Admins'], ['user','Usuários'], ['inativos','Inativos']].map(([f,l]) =>
        e('button', {key:f, onClick:()=>setFilter(f),
          style:{padding:'7px 15px', borderRadius:8, cursor:'pointer', border:`1px solid ${filter===f?v('accent')+'60':v('border')}`, background:filter===f?v('accent-dim'):v('card'), color:filter===f?v('accent'):v('text-s'), fontSize:11.5, fontWeight:600, fontFamily:"var(--sans)", transition:'all 0.15s'}}, l)),
    ),

    // Table
    e('div', {style:{background:v('card'), border:`1px solid ${v('border')}`, borderRadius:14, overflow:'hidden', boxShadow:`0 1px 3px ${v('shadow')}`}},
      e('div', {style:{display:'grid', gridTemplateColumns:'2fr 1.2fr 2fr 80px 90px 120px', padding:'11px 20px', borderBottom:`1px solid ${v('border')}`, background:v('elevated'), fontSize:9, fontWeight:700, color:v('faint'), textTransform:'uppercase', letterSpacing:'1.2px', fontFamily:"var(--sans)"}},
        e('span', null, 'Nome'), e('span', null, 'Usuário'), e('span', null, 'Email'), e('span', null, 'Papel'), e('span', null, 'Status'), e('span', null, 'Ações'),
      ),
      filtered.length===0 ? e('div', {style:{padding:'40px 20px', textAlign:'center', color:v('muted'), fontSize:13.5, fontFamily:"var(--sans)"}}, 'Nenhum usuário encontrado') :
      filtered.map((u,i) => e('div', {key:u.id, style:{display:'grid', gridTemplateColumns:'2fr 1.2fr 2fr 80px 90px 120px', alignItems:'center', padding:'12px 20px', borderBottom:i<filtered.length-1?`1px solid ${v('border')}`:'none', transition:'background 0.12s', opacity:u.active?1:0.5},
        onMouseEnter:ev=>ev.currentTarget.style.background=v('accent-dim'),
        onMouseLeave:ev=>ev.currentTarget.style.background='transparent'},
        e('div', {style:{display:'flex', alignItems:'center', gap:10, minWidth:0}},
          e(Avatar, {role:'user', user:u}),
          e('div', {style:{minWidth:0}},
            e('div', {style:{fontSize:13, fontWeight:600, color:v('text'), fontFamily:"var(--sans)", overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}, u.name),
            e('div', {style:{fontSize:10.5, color:v('faint'), fontFamily:"var(--sans)"}}, u.lastLogin?`último: ${fmtDate(u.lastLogin)}`:'nunca'),
          ),
        ),
        e('code', {style:{fontSize:11.5, color:v('accent'), fontFamily:"var(--mono)"}}, u.username),
        e('span', {style:{fontSize:11.5, color:v('text-s'), fontFamily:"var(--sans)", overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}, u.email),
        e('span', {onClick:()=>tog(u.id, 'role'), style:{padding:'3px 10px', borderRadius:6, fontSize:10.5, fontWeight:700, fontFamily:"var(--sans)", cursor:u.id===currentUser.id?'not-allowed':'pointer', background:u.role==='admin'?v('purple-dim'):v('blue-dim'), color:u.role==='admin'?v('purple'):v('blue'), border:`1px solid ${u.role==='admin'?v('purple')+'40':v('blue')+'40'}`, width:'fit-content'}}, u.role==='admin'?'ADMIN':'USER'),
        e('span', {onClick:()=>tog(u.id, 'active'), style:{padding:'3px 10px', borderRadius:6, fontSize:10.5, fontWeight:700, fontFamily:"var(--sans)", cursor:u.id===currentUser.id?'not-allowed':'pointer', background:u.active?v('green-dim'):v('red-dim'), color:u.active?v('green'):v('red'), border:`1px solid ${u.active?v('green')+'40':v('red')+'40'}`, width:'fit-content'}}, u.active?'ATIVO':'INATIVO'),
        e('div', {style:{display:'flex', gap:4}},
          e('button', {onClick:()=>resetPw(u.id), title:'Redefinir senha', style:{background:'none', border:'none', color:v('muted'), cursor:'pointer', fontSize:13, padding:'4px 7px', borderRadius:5, transition:'all 0.12s'}, onMouseEnter:ev=>{ev.currentTarget.style.color=v('accent');}, onMouseLeave:ev=>{ev.currentTarget.style.color=v('muted');}}, '🔑'),
          e('button', {onClick:()=>del(u.id), disabled:u.id===currentUser.id, style:{background:'none', border:'none', color:u.id===currentUser.id?v('faint'):v('muted'), cursor:u.id===currentUser.id?'not-allowed':'pointer', fontSize:13, padding:'4px 7px', borderRadius:5, transition:'all 0.12s'}, onMouseEnter:ev=>{if(u.id!==currentUser.id) ev.currentTarget.style.color=v('red');}, onMouseLeave:ev=>{ev.currentTarget.style.color=u.id===currentUser.id?v('faint'):v('muted');}}, '🗑'),
        ),
      ))
    ),
  );
}

// ═══════════════════════════════════════════════════════════════
// APP PRINCIPAL
// ═══════════════════════════════════════════════════════════════
function NexusIA(){
  const [users, setUsers] = useState(()=>initUsers());
  const [theme, setTheme] = useState(()=>ld(K_THEME, 'dark'));
  const [currentUser, setCurrentUser] = useState(()=>{
    const s = ld(K_SESSION, null);
    if(!s) return null;
    const u = ld(K_USERS, []).find(x=>x.id===s.userId);
    return u && u.active ? u : null;
  });
  const [cfg, setCfg] = useState(()=>ld(K_CFG, {apiKey:'', model:DEFAULT_MODEL, mode:'academic', systemPrompt:''}));
  const [convs, setConvs] = useState(()=>ld(K_CONVS, []));
  const [activeId, setActiveId] = useState(()=>ld(K_CONVS, [])[0]?.id||null);
  const [docs, setDocs] = useState(()=>ld(K_DOCS, []));
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('chat');
  const [cloudStatus, setCloudStatus] = useState('checking');

  useEffect(()=>{ applyTheme(theme); }, [theme]);
  const handleChangeTheme = useCallback((t)=>setTheme(t), []);

  useEffect(()=>{
    if(!currentUser) return;
    let cancelled = false;
    (async () => {
      const online = await cloudPing();
      if(cancelled) return;
      setCloudStatus(online ? 'online' : 'offline');
      if(!online) return;
      const [cloudConvs, cloudDocs, cloudCfg] = await Promise.all([
        cloudGetConvs(currentUser.id),
        cloudGetDocs(currentUser.id),
        cloudGetSettings(currentUser.id),
      ]);
      if(cancelled) return;
      if(cloudConvs && cloudConvs.length>0){
        setConvs(cloudConvs); sv(K_CONVS, cloudConvs);
        setActiveId(cloudConvs[0]?.id||null);
      }
      if(cloudDocs){ setDocs(cloudDocs); sv(K_DOCS, cloudDocs); }
      if(cloudCfg){
        const merged = {...cloudCfg, apiKey: cloudCfg.apiKey || cfg.apiKey || ''};
        setCfg(merged); sv(K_CFG, merged);
      }
    })();
    return () => {cancelled = true;};
  }, [currentUser?.id]);

  useEffect(()=>{sv(K_CONVS, convs);}, [convs]);
  useEffect(()=>{sv(K_DOCS, docs);}, [docs]);
  useEffect(()=>{sv(K_CFG, cfg);}, [cfg]);

  const activeConv = convs.find(c=>c.id===activeId) || null;

  const handleLogin = useCallback(u => {setCurrentUser(u); setUsers(ld(K_USERS, [])); setView('chat');}, []);
  const handleLogout = useCallback(() => {
    localStorage.removeItem(K_SESSION);
    setCurrentUser(null); setConvs([]); setDocs([]); setActiveId(null);
  }, []);

  const handleUpdateUser = useCallback(upd => {
    const all = ld(K_USERS, []);
    const na = all.map(u=>u.id===upd.id?upd:u);
    sv(K_USERS, na); setUsers(na);
    if(upd.id===currentUser?.id) setCurrentUser(upd);
    cloudSaveUser(upd);
  }, [currentUser]);

  const handleSaveCfg = useCallback(newCfg => {
    setCfg(newCfg);
    if(currentUser) cloudSaveSettings(currentUser.id, newCfg);
  }, [currentUser]);

  const newConv = useCallback(() => {
    const c = {id:uid(), title:'Nova conversa', messages:[], createdAt:Date.now(), updatedAt:Date.now()};
    setConvs(p=>[c, ...p]); setActiveId(c.id); setView('chat'); return c;
  }, []);

  const deleteConv = useCallback(id => {
    setConvs(p=>p.filter(c=>c.id!==id));
    setActiveId(p=>p===id?convs.find(c=>c.id!==id)?.id||null:p);
    cloudDeleteConv(id);
  }, [convs]);

  const clearConv = useCallback(() => {
    if(!activeConv) return;
    const cleared = {...activeConv, messages:[], title:'Nova conversa', updatedAt:Date.now()};
    setConvs(p=>p.map(c=>c.id===activeConv.id?cleared:c));
    if(currentUser) cloudSaveConv(cleared, currentUser.id);
  }, [activeConv, currentUser]);

  const deleteDoc = useCallback(id => {
    setDocs(p=>p.filter(d=>d.id!==id));
    cloudDeleteDoc(id);
  }, []);

  const downloadDoc = useCallback(d => {
    const md = `# ${d.name}\n\n_${fmtDate(d.createdAt)}_\n\n---\n\n${d.content}`;
    const b = new Blob([md], {type:'text/markdown'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = `${d.name.slice(0,50).replace(/[^a-z0-9]/gi, '-')}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, []);

  const handleSend = useCallback(async rawText => {
    if(!cfg.apiKey || loading) return;
    if(rawText.trim()==='/limpar'){ clearConv(); return; }
    if(rawText.trim()==='/ajuda'){
      let conv = activeConv || {id:uid(), title:'Ajuda', messages:[], createdAt:Date.now(), updatedAt:Date.now()};
      const help = SLASH_COMMANDS.map(c=>`**${c.cmd}** — ${c.desc}`).join('\n');
      const msgs = [...conv.messages,
        {id:uid(), role:'user', content:'/ajuda', timestamp:Date.now()},
        {id:uid(), role:'assistant', content:'## Comandos disponíveis\n\n'+help+'\n\n*Digite `/` para autocompletar.*', timestamp:Date.now()}];
      const upd = {...conv, messages:msgs, updatedAt:Date.now()};
      setConvs(p=>{const ex=p.find(c=>c.id===upd.id); return ex?p.map(c=>c.id===upd.id?upd:c):[upd, ...p];});
      setActiveId(upd.id);
      if(currentUser) cloudSaveConv(upd, currentUser.id);
      return;
    }
    const tools = toolsForSlash(rawText);
    const text = expandSlash(rawText);
    const sys = cfg.systemPrompt || SYSTEM_PROMPTS[cfg.mode] || SYSTEM_PROMPTS.general;
    let conv = activeConv || {id:uid(), title:genTitle(rawText), messages:[], createdAt:Date.now(), updatedAt:Date.now()};
    const userMsg = {id:uid(), role:'user', content:rawText, tools, timestamp:Date.now()};
    const aiId = uid();
    const aiMsg = {id:aiId, role:'assistant', content:'', timestamp:Date.now()};
    const upd = {...conv, title:conv.messages.length===0?genTitle(rawText):conv.title, messages:[...conv.messages, userMsg, aiMsg], updatedAt:Date.now()};
    setConvs(p=>{const ex=p.find(c=>c.id===upd.id); return ex?p.map(c=>c.id===upd.id?upd:c):[upd, ...p];});
    setActiveId(upd.id); setLoading(true);
    const history = [...conv.messages.slice(-12), {role:'user', content:text}].map(m=>({role:m.role, content:m.content}));
    try {
      let final = '';
      await callGroq(cfg.apiKey, cfg.model||DEFAULT_MODEL, history, sys, partial => {
        final = partial;
        setConvs(p=>p.map(c=>c.id===upd.id?{...c, messages:c.messages.map(m=>m.id===aiId?{...m, content:partial, toolsDone:true}:m)}:c));
      });
      if(final.length > 400){
        const doc = {id:uid(), name:genTitle(rawText), content:final, type:docType(final, rawText), createdAt:Date.now()};
        setDocs(p=>[doc, ...p]);
        setConvs(p=>p.map(c=>c.id===upd.id?{...c, messages:c.messages.map(m=>m.id===aiId?{...m, savedDoc:doc}:m)}:c));
        if(currentUser) cloudSaveDoc(doc, currentUser.id);
      }
      if(currentUser){
        setTimeout(()=>{ const latest=ld(K_CONVS, []).find(c=>c.id===upd.id); if(latest) cloudSaveConv(latest, currentUser.id); }, 100);
      }
    } catch(err) {
      const msg = err.message || '';
      let friendlyMsg = `❌ **Erro:** ${msg}`;
      if(msg.includes('Request too large') || msg.includes('TPM') || msg.includes('tokens per minute')){
        friendlyMsg = `⚠️ **Limite de tokens atingido**\n\nO modelo **${cfg.model}** excedeu o limite de tokens por minuto (TPM) do tier gratuito da Groq.\n\n**Soluções:**\n- ✅ Vá em **Configurações** e troque para **Llama 3.3 70B** ou **Llama 3.1 8B Instant**\n- 🧹 Use **/limpar** para zerar o histórico (reduz tokens enviados)\n- 💎 Upgrade para tier Dev em [console.groq.com/settings/billing](https://console.groq.com/settings/billing)`;
      } else if(msg.includes('Invalid API Key') || msg.includes('401')){
        friendlyMsg = `🔑 **API Key inválida**\n\nSua Groq API Key foi rejeitada. Vá em **Configurações** e cole uma key válida de [console.groq.com](https://console.groq.com).`;
      } else if(msg.includes('rate limit') || msg.includes('429')){
        friendlyMsg = `⏱ **Muitas requisições**\n\nAguarde alguns segundos e tente novamente.`;
      }
      setConvs(p=>p.map(c=>c.id===upd.id?{...c, messages:c.messages.map(m=>m.id===aiId?{...m, content:friendlyMsg}:m)}:c));
    }
    setLoading(false);
  }, [activeConv, loading, cfg, clearConv, currentUser]);

  if(!currentUser) return e(LoginScreen, {onLogin:handleLogin, theme, onChangeTheme:handleChangeTheme});
  const userCount = ld(K_USERS, []).length;

  return e('div', {style:{display:'flex', height:'100vh', overflow:'hidden'}},
    e(Sidebar, {user:currentUser, convs, activeId, onSelect:setActiveId, onNew:newConv, onDelete:deleteConv, view, onView:setView, onLogout:handleLogout, userCount, cloudStatus}),
    view==='chat' ? e(ChatView, {user:currentUser, conv:activeConv, cfg, onSend:handleSend, loading, onClear:clearConv, theme, onChangeTheme:handleChangeTheme}) : null,
    view==='arquivo' ? e(ArquivoView, {docs, onDelete:deleteDoc, onDownload:downloadDoc}) : null,
    view==='settings' ? e(SettingsView, {user:currentUser, cfg, onSave:handleSaveCfg, onUpdateUser:handleUpdateUser, theme, onChangeTheme:handleChangeTheme}) : null,
    view==='admin' && currentUser.role==='admin' ? e(AdminView, {currentUser, onUpdate:handleUpdateUser}) : null,
  );
}

window.__NexusIA = NexusIA;

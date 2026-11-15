const SCOPE='https://www.googleapis.com/auth/drive.file';
const DRIVE='https://www.googleapis.com/drive/v3/files';
const SHEETS='https://sheets.googleapis.com/v4/spreadsheets';
const MARKER='vi-rotina-v3';
export const TABS=['Estado','Rotina','Conclusoes','Refeicoes','Metas','Financas','Eventos','Progresso'];
const $=id=>document.getElementById(id);
function gate(show){$('cloudGate').hidden=!show;$('shell').inert=show;document.querySelector('nav').inert=show;}
export function validateState(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Backup inválido.');
 for(const key of ['tasks','meals','goals','finance']){
  if(!Array.isArray(value[key])||value[key].length>15000)throw Error('Registros inválidos: '+key);
  for(const item of value[key])if(!item||typeof item!=='object'||!/^[a-zA-Z0-9_-]{1,100}$/.test(item.id||''))throw Error('Identificador inválido no backup.');
 }
 for(const t of value.tasks){if(!Array.isArray(t.days)||t.days.some(d=>!Number.isInteger(d)||d<0||d>6))throw Error('Dias inválidos em uma tarefa.');}
 for(const key of ['tasks','meals','goals','finance'])for(const item of value[key])for(const field of ['name','time','date','kind','type','note','food','origin','deadline','unit'])if(item[field]!=null&&typeof item[field]!=='string')throw Error('Campo inválido: '+field);
 if(!value.checks||Array.isArray(value.checks)||typeof value.checks!=='object')throw Error('Histórico de conclusões inválido.');
 if(value.dailyPlans&&Object.values(value.dailyPlans).some(plan=>!Array.isArray(plan)))throw Error('Histórico de planejamento inválido.');
 if(value.events&&!Array.isArray(value.events))throw Error('Histórico de eventos inválido.');
 const json=JSON.stringify(value);if(json.length>900000)throw Error('O histórico está grande demais para esta versão. Exporte um backup antes de continuar.');
 return value;
}
export function stateRows(data,revision,at){
 const json=JSON.stringify(validateState(data));const chunks=[];for(let i=0;i<json.length;){let end=Math.min(i+20000,json.length);if(end<json.length&&/[\uD800-\uDBFF]/.test(json[end-1]))end--;chunks.push(['parte_'+chunks.length,json.slice(i,end)]);i=end;}
 return [['formato','vi-rotina-v3'],['revisao',revision],['atualizado_em',at],...chunks];
}
export function parseStateRows(rows){
 if(!rows?.length)return {data:null,revision:''};
 if(rows[0]?.[1]!=='vi-rotina-v3')throw Error('Formato de planilha não reconhecido. Nenhum dado foi substituído.');
 const rev=rows.find(r=>r[0]==='revisao')?.[1]||'';
 const chunks=rows.filter(r=>/^parte_\d+$/.test(r[0]||''));
 chunks.forEach((r,i)=>{if(r[0]!=='parte_'+i)throw Error('A cópia de recuperação está incompleta.');});
 if(!chunks.length)return {data:null,revision:rev};
 return {data:validateState(JSON.parse(chunks.map(r=>r[1]||'').join(''))),revision:rev};
}
export function tables(data){
 const names=new Map(data.tasks.map(t=>[t.id,t]));
 const plans=data.dailyPlans||{};
 const completions=Object.entries(data.checks).map(([key,at])=>{const [date,id]=key.split('|');const t=plans[date]?.find(t=>t.id===id)||names.get(id);return [date,id,t?.name||'Tarefa removida',t?.kind||'',t?.time||'',at];});
 const progress=Object.entries(plans).sort(([a],[b])=>a.localeCompare(b)).map(([date,plan])=>{const done=plan.filter(t=>data.checks[date+'|'+t.id]).length;return [date,plan.length,done,plan.length-done,plan.length?done/plan.length:0,'Planejamento registrado ao abrir o dia'];});
 return {
 Rotina:[['ID','Nome','Categoria','Horario','Dias (0=domingo)','Dose prescrita','Duracao da pausa (min)','Observacoes'],...data.tasks.map(t=>[t.id,t.name,t.kind,t.time,(t.days||[]).join(','),t.dose||'',t.duration||'',t.note||''])],
 Conclusoes:[['Data','ID da tarefa','Tarefa','Categoria','Horario previsto','Concluida em (ISO)'],...completions],
 Refeicoes:[['ID','Data','Horario','Refeicao','Origem','Descricao'],...data.meals.map(m=>[m.id,m.date,m.time,m.type,m.origin,m.food])],
 Metas:[['ID','Meta','Unidade','Objetivo','Progresso','Prazo','Descricao'],...data.goals.map(g=>[g.id,g.name,g.unit||'R$',Number(g.target||0),Number(g.current||0),g.deadline,g.note])],
 Financas:[['ID','Descricao','Tipo','Valor (R$)','Data ou vencimento','Pago'],...data.finance.map(f=>[f.id,f.name,f.type,Number(f.value||0),f.date,!!f.paid])],
 Eventos:[['ID do evento','Instante (ISO)','Acao','Modulo','ID do registro','Nome no momento','Data local'],...(data.events||[]).map(e=>[e.id,e.at,e.action,e.entity,e.recordId,e.name,e.date])],
 Progresso:[['Data','Tarefas previstas','Concluidas','Pendentes','Proporcao concluida (0 a 1)','Base de calculo'],...progress]
 };
}
export function cells(rows){return rows.map(row=>({values:row.map(v=>({userEnteredValue:typeof v==='number'&&Number.isFinite(v)?{numberValue:v}:typeof v==='boolean'?{boolValue:v}:{stringValue:String(v??'')}}))}));}
export class SheetsStore{
 constructor(){
  this.token='';this.expires=0;this.sheetId='';this.revision='';this.busy=false;this.meta=null;this.onReady=()=>{};this.onLock=()=>{};this.failed=false;
  $('googleClientId').value=window.VI_CONFIG?.googleClientId||localStorage.getItem('vi-google-client-id')||'';
  $('saveClientId').onclick=()=>{const id=$('googleClientId').value.trim();if(!this.validClient(id))return this.error('Informe o ID público OAuth, terminado em .apps.googleusercontent.com.');localStorage.setItem('vi-google-client-id',id);this.error('Configuração salva. Toque em Conectar com Google.');};
  $('googleConnect').onclick=()=>this.connect();
  $('retryCloud').onclick=()=>this.connect(true);
  $('exportPending').onclick=()=>window.backup();
  window.addEventListener('pagehide',()=>{this.token='';});
 }
 validClient(id){return /^[\w-]+\.apps\.googleusercontent\.com$/.test(id);}
 error(message){$('cloudError').textContent=message;}
 async api(url,options={}){
  if(!this.token||Date.now()>=this.expires){this.token='';throw Error('Sua autorização Google expirou. Reconecte para continuar; as alterações pendentes permanecem nesta página.');}
  let r;try{r=await fetch(url,{...options,headers:{Authorization:'Bearer '+this.token,...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}})}catch{throw Error('Sem conexão com o Google. Não feche a página: reconecte ou exporte suas alterações.');}
  const result=await r.json().catch(()=>({}));
  if(!r.ok){if(r.status===401)this.token='';const msg=r.status===403?'O Google negou o acesso. Confira as APIs ativadas e a permissão concedida.':r.status===429?'O limite temporário do Google foi atingido. Aguarde e reconecte; nenhum reenvio automático foi feito.':r.status===401?'Sua sessão Google expirou. Reconecte para continuar.':'Falha do Google ('+r.status+'). '+(result.error?.message||'');throw Error(msg);}
  return result;
 }
 connect(recover=false){
  const id=$('googleClientId').value.trim();if(!this.validClient(id)){this.error('Configure o ID público do login Google abaixo para começar.');$('setupDetails').open=true;return;}
  if(!window.google?.accounts?.oauth2){this.error('O login Google ainda não carregou. Verifique a conexão e tente novamente.');return;}
  if(this.busy)return;this.busy=true;this.error('Abrindo autorização do Google…');
  const client=google.accounts.oauth2.initTokenClient({client_id:id,scope:SCOPE,include_granted_scopes:false,prompt:'select_account',callback:async response=>{
   try{
    if(response.error||!response.access_token)throw Error('A autorização foi cancelada ou não foi concedida.');
    if(!google.accounts.oauth2.hasGrantedAllScopes(response,SCOPE))throw Error('Autorize o acesso aos arquivos que este aplicativo criar.');
    this.token=response.access_token;this.expires=Date.now()+Math.max(0,(Number(response.expires_in)-60))*1000;
    if(recover&&this.sheetId){const files=await this.discover();if(!files.some(f=>f.id===this.sheetId))throw Error('Escolha a mesma conta Google usada antes.');const remote=await this.read();if(remote.revision!==this.revision)throw Error('Há uma versão diferente na planilha. Exporte as alterações pendentes e recarregue para evitar sobrescrever os dados.');this.failed=false;await this.onRecover?.();gate(false);this.error('');}
    else await this.select();
   }catch(e){this.error(e.message);}finally{this.busy=false;}
  },error_callback:()=>{this.busy=false;this.error('A janela do Google foi fechada ou bloqueada. Toque novamente para abrir.');}});
  client.requestAccessToken();
 }
 async discover(){
  const q="trashed=false and mimeType='application/vnd.google-apps.spreadsheet' and appProperties has { key='viRotina' and value='"+MARKER+"' }";
  const result=await this.api(DRIVE+'?q='+encodeURIComponent(q)+'&fields=files(id,name),nextPageToken&pageSize=100');
  if(result.nextPageToken)throw Error('Muitas planilhas encontradas. Organize as cópias no Drive antes de continuar.');return result.files||[];
 }
 async select(){
  const files=await this.discover();$('cloudChoices').replaceChildren();
  if(files.length===1){await this.open(files[0].id);return;}
  this.error(files.length?'Escolha qual planilha deseja usar.':'Nenhuma planilha do Vi Rotina encontrada nesta conta.');
  if(files.length)for(const f of files){const b=document.createElement('button');b.className='btn secondary';b.textContent=f.name+' · '+f.id.slice(-6);b.onclick=()=>this.guarded(()=>this.open(f.id));$('cloudChoices').append(b);}
  else{const b=document.createElement('button');b.className='btn secondary';b.textContent='Criar minha planilha privada';b.onclick=()=>this.guarded(()=>this.create());$('cloudChoices').append(b);}
 }
 async guarded(action){if(this.busy)return;this.busy=true;try{await action()}catch(e){this.error(e.message)}finally{this.busy=false;}}
 async create(){
  // Only this explicit click creates a file. No sharing/permissions are changed.
  const file=await this.api(DRIVE+'?fields=id',{method:'POST',body:JSON.stringify({name:'Vi Rotina — meus registros',mimeType:'application/vnd.google-apps.spreadsheet',appProperties:{viRotina:MARKER}})});
  this.sheetId=file.id;await this.ensureTabs();await this.open(file.id);
 }
 async ensureTabs(){
  const meta=await this.api(SHEETS+'/'+this.sheetId+'?fields=sheets(properties)');const existing=new Set(meta.sheets.map(s=>s.properties.title));const requests=[];
  for(const title of TABS)if(!existing.has(title))requests.push({addSheet:{properties:{title,gridProperties:{rowCount:1000,columnCount:12,frozenRowCount:title==='Estado'?0:1}}}});
  if(requests.length)await this.api(SHEETS+'/'+this.sheetId+':batchUpdate',{method:'POST',body:JSON.stringify({requests})});
  this.meta=await this.api(SHEETS+'/'+this.sheetId+'?fields=sheets(properties)');
 }
 async read(){const r=await this.api(SHEETS+'/'+this.sheetId+'/values/'+encodeURIComponent("'Estado'!A1:B100"));return parseStateRows(r.values);}
 async open(id){this.sheetId=id;await this.ensureTabs();const current=await this.read();this.revision=current.revision;this.failed=false;await this.onReady(current.data);gate(false);$('cloudChoices').replaceChildren();this.error('');$('retryCloud').hidden=true;$('exportPending').hidden=true;}
 get sheetUrl(){return 'https://docs.google.com/spreadsheets/d/'+this.sheetId+'/edit';}
 async reload(){const state=await this.read();this.revision=state.revision;await this.onReady(state.data);}
 async save(data){
  if(this.failed)throw Error('Há alterações pendentes. Reconecte ou exporte um backup antes de continuar.');
  if(!this.sheetId)throw Error('Conecte uma planilha antes de salvar.');validateState(data);
  const remote=await this.read();if(remote.revision!==this.revision)throw Error('A planilha mudou em outro dispositivo. Exporte um backup das alterações e atualize os dados antes de continuar.');
  const revision=crypto.randomUUID(),at=new Date().toISOString();const all={Estado:stateRows(data,revision,at),...tables(data)};const requests=[];
  for(const [title,rows] of Object.entries(all)){
   const sheet=this.meta.sheets.find(s=>s.properties.title===title)?.properties;if(!sheet)throw Error('Aba ausente: '+title);
   const rowCount=Math.max(sheet.gridProperties.rowCount,rows.length+20);const colCount=Math.max(sheet.gridProperties.columnCount,...rows.map(r=>r.length));
   if(rowCount!==sheet.gridProperties.rowCount||colCount!==sheet.gridProperties.columnCount)requests.push({updateSheetProperties:{properties:{sheetId:sheet.sheetId,gridProperties:{rowCount,columnCount:colCount}},fields:'gridProperties.rowCount,gridProperties.columnCount'}});
   requests.push({updateCells:{range:{sheetId:sheet.sheetId,startRowIndex:0,endRowIndex:rowCount,startColumnIndex:0,endColumnIndex:colCount},rows:cells(rows),fields:'userEnteredValue'}});
   if(title!=='Estado')requests.push({repeatCell:{range:{sheetId:sheet.sheetId,startRowIndex:0,endRowIndex:1},cell:{userEnteredFormat:{backgroundColor:{red:.91,green:.86,blue:.95},textFormat:{bold:true,foregroundColor:{red:.27,green:.19,blue:.34}},wrapStrategy:'WRAP'}},fields:'userEnteredFormat'} });
  }
  const body=JSON.stringify({requests});if(new TextEncoder().encode(body).length>1900000)throw Error('Histórico grande demais para sincronizar de uma vez. Exporte um backup e solicite a ampliação da integração.');
  try{await this.api(SHEETS+'/'+this.sheetId+':batchUpdate',{method:'POST',body});}
  catch(error){try{const check=await this.read();if(check.revision===revision){this.revision=revision;return;}}catch{}this.failed=true;throw error;}
  this.revision=revision;
  for(const [title,rows] of Object.entries(all)){const p=this.meta.sheets.find(s=>s.properties.title===title).properties;p.gridProperties.rowCount=Math.max(p.gridProperties.rowCount,rows.length+20);}
 }
 showRecovery(message){this.failed=true;gate(true);this.error(message+'\nSuas alterações permanecem nesta página.');$('retryCloud').hidden=false;$('exportPending').hidden=false;$('googleConnect').hidden=true;$('cloudChoices').replaceChildren();}
 logout(){this.token='';this.expires=0;this.sheetId='';this.revision='';this.failed=false;this.onLock();gate(true);$('googleConnect').hidden=false;$('retryCloud').hidden=true;$('exportPending').hidden=true;this.error('Você saiu. Entre com Google para acessar seus registros.');}
}

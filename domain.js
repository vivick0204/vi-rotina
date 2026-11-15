export const isMedicine=t=>t.kind==='medicamento';
export const routineTasks=db=>db.tasks.filter(t=>!isMedicine(t));
const normalized=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function upgradeState(db,makeId){
 let changed=false;
 if(!db.appointments){db.appointments=[];changed=true;}
 db.upgrades ||= {};
 if(!db.upgrades.routineHealth){
  const additions=[['Almoço',[0,1,2,3,4,5,6],'refeicao'],['Jantar',[0,1,2,3,4,5,6],'refeicao'],['Academia',[1,2,3,4],'atividade'],['Missa',[0],'compromisso']];
  for(const [name,days,kind] of additions)if(!routineTasks(db).some(t=>normalized(t.name)===normalized(name)))db.tasks.push({id:makeId(),name,days,kind,time:'',note:''});
  db.upgrades.routineHealth=true;changed=true;
 }
 return changed;
}
export function calendarDraft(appointment){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(appointment.date||'')||!/^\d{2}:\d{2}$/.test(appointment.time||''))throw Error('Defina a data e o horário antes de adicionar ao Google Agenda.');
 const duration=Number(appointment.duration||60);if(!Number.isFinite(duration)||duration<5||duration>1440)throw Error('Duração inválida.');
 const start=new Date(appointment.date+'T'+appointment.time+':00');if(Number.isNaN(start.getTime()))throw Error('Data inválida.');
 const end=new Date(start.getTime()+duration*60000),stamp=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
 const params=new URLSearchParams({action:'TEMPLATE',text:(appointment.kind==='exame'?'Exame: ':'Consulta: ')+appointment.name,dates:stamp(start)+'/'+stamp(end),location:appointment.location||'',details:'Compromisso cadastrado no Vi Rotina.'});
 return 'https://calendar.google.com/calendar/render?'+params;
}
export function validImagePath(path){return !path||/^assets\/images\/[a-zA-Z0-9_./-]+\.(png|jpe?g|webp|gif|svg)$/i.test(path)&&!path.includes('..');}

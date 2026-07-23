/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

type TxType = "income" | "expense";
type TxStatus = "paid" | "pending";
type Transaction = { id:string; type:TxType; date:string; description:string; area:string; category:string; amount:number; status:TxStatus; notes:string };
type Budget = { id:string; kind:TxType; area:string; category:string; planned:number };
type Debt = { id:string; name:string; balance:number; plannedPayment:number; paid:number; dueDay:number };
type Recurring = { id:string; name:string; amount:number; frequency:string; nextDate:string; area:string; active:boolean };
type Audit = { id:string; at:string; action:string; detail:string };
type Profile = { name:string; email:string };
type Store = { transactions:Transaction[]; budgets:Budget[]; debts:Debt[]; recurring:Recurring[]; areas:string[]; categories:string[]; monthlyNote:string; audit:Audit[]; profile:Profile };
type Editor = { kind:"transaction"|"budget"|"debt"|"recurring"; id?:string } | null;
type Screen = "home"|"transactions"|"budget"|"reports"|"more";

const uid=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
const today=new Date().toISOString().slice(0,10);
const initial:Store={
  transactions:[],
  budgets:[],
  debts:[],
  recurring:[],
  areas:["Hogar","Trabajo","Personal","Otros"],
  categories:["Alimentación","Servicios","Transporte","Deudas","Salud","Ingresos","Otros"],
  monthlyNote:"",
  audit:[],
  profile:{name:"Mi perfil",email:""}
};

const money=(value:number)=>new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(value);
const dateLabel=(value:string)=>new Intl.DateTimeFormat("es-MX",{day:"numeric",month:"short"}).format(new Date(`${value}T12:00:00`));
const cloneInitial=():Store=>JSON.parse(JSON.stringify(initial));
const legacyDemoIds=["t1","t2","t3","t4","t5","t6","t7"];
const isUntouchedDemo=(value:any)=>Array.isArray(value?.transactions)&&value.transactions.length===legacyDemoIds.length&&legacyDemoIds.every(id=>value.transactions.some((item:any)=>item.id===id))&&(!value.audit||value.audit.length===0);
const normalizeStore=(value:any):Store=>({...cloneInitial(),...value,profile:{...initial.profile,...value?.profile}});
const initials=(name:string)=>name.trim().split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join("")||"MB";

export default function Home(){
  const [store,setStore]=useState<Store>(initial);
  const [ready,setReady]=useState(false);
  const [screen,setScreen]=useState<Screen>("home");
  const [editor,setEditor]=useState<Editor>(null);
  const [deleteTarget,setDeleteTarget]=useState<Editor>(null);
  const [filter,setFilter]=useState("all");
  const [search,setSearch]=useState("");
  const [toast,setToast]=useState("");
  const [showAmounts,setShowAmounts]=useState(true);

  useEffect(()=>{
    try{const saved=localStorage.getItem("mi-balance-v1");if(saved){const parsed=JSON.parse(saved);setStore(isUntouchedDemo(parsed)?cloneInitial():normalizeStore(parsed));}}catch{}
    setReady(true);
    if("serviceWorker" in navigator)navigator.serviceWorker.register(new URL("sw.js",window.location.href).pathname).catch(()=>{});
  },[]);
  useEffect(()=>{if(ready)localStorage.setItem("mi-balance-v1",JSON.stringify(store));},[store,ready]);
  useEffect(()=>{if(!toast)return;const id=setTimeout(()=>setToast(""),2500);return()=>clearTimeout(id)},[toast]);

  const summary=useMemo(()=>{
    const paid=store.transactions.filter(t=>t.status==="paid");
    const income=paid.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
    const expense=paid.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
    const pending=store.transactions.filter(t=>t.status==="pending"&&t.type==="expense").reduce((s,t)=>s+t.amount,0);
    const incomePlan=store.budgets.filter(b=>b.kind==="income").reduce((s,b)=>s+b.planned,0);
    const expensePlan=store.budgets.filter(b=>b.kind==="expense").reduce((s,b)=>s+b.planned,0);
    return{income,expense,pending,incomePlan,expensePlan,balance:income-expense,projected:income-expense-pending};
  },[store]);
  const displayMoney=(n:number)=>showAmounts?money(n):"••••";
  const notify=(message:string)=>setToast(message);
  const log=(action:string,detail:string):Audit=>({id:uid(),at:new Date().toISOString(),action,detail});

  function saveEntity(kind:NonNullable<Editor>["kind"],value:any,id?:string){
    setStore(prev=>{
      const key=kind==="transaction"?"transactions":kind==="budget"?"budgets":kind==="debt"?"debts":"recurring";
      const list:any[]=[...prev[key]];
      const existing=id?list.findIndex(x=>x.id===id):-1;
      const record={...value,id:id||uid()};
      if(existing>=0)list[existing]=record;else list.unshift(record);
      return{...prev,[key]:list,audit:[log(existing>=0?"Editó":"Creó",`${labelKind(kind)}: ${record.description||record.name||record.category}`),...prev.audit].slice(0,50)};
    });
    setEditor(null);notify(id?"Cambios guardados":"Registro agregado");
  }
  function confirmDelete(){
    if(!deleteTarget)return;
    setStore(prev=>{
      const key=deleteTarget.kind==="transaction"?"transactions":deleteTarget.kind==="budget"?"budgets":deleteTarget.kind==="debt"?"debts":"recurring";
      const current=(prev[key] as any[]).find(x=>x.id===deleteTarget.id);
      return{...prev,[key]:(prev[key] as any[]).filter(x=>x.id!==deleteTarget.id),audit:[log("Eliminó",`${labelKind(deleteTarget.kind)}: ${current?.description||current?.name||current?.category||"registro"}`),...prev.audit].slice(0,50)};
    });
    setDeleteTarget(null);setEditor(null);notify("Registro eliminado");
  }
  function edit(kind:NonNullable<Editor>["kind"],id?:string){setEditor({kind,id})}

  const nav:{id:Screen;label:string;icon:string}[]=[
    {id:"home",label:"Inicio",icon:"⌂"},{id:"transactions",label:"Movimientos",icon:"≡"},{id:"budget",label:"Presupuesto",icon:"▥"},{id:"reports",label:"Reportes",icon:"◔"},{id:"more",label:"Ajustes",icon:"⚙"}
  ];
  return <main className="app-shell">
    <aside className="desktop-brand"><div className="logo">MB</div><h1>Mi Balance</h1><p>Tu dinero, claro y en calma.</p><small>Los datos se guardan únicamente en este dispositivo.</small></aside>
    <section className="phone">
      <header className="topbar"><div className="avatar">{initials(store.profile.name)}</div><div><small>{screen==="reports"?"Tu historia financiera":"Mi balance"}</small><strong>{screenTitle(screen)}</strong></div><button className="icon-btn" onClick={()=>setShowAmounts(v=>!v)} aria-label={showAmounts?"Ocultar cantidades":"Mostrar cantidades"}>{showAmounts?"◉":"○"}</button></header>
      <div className="content">
        {screen==="home"&&<Dashboard store={store} summary={summary} money={displayMoney} edit={edit} go={setScreen}/>} 
        {screen==="transactions"&&<Transactions store={store} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} edit={edit}/>} 
        {screen==="budget"&&<Budgets store={store} edit={edit}/>} 
        {screen==="reports"&&<Reports store={store} summary={summary} setStore={setStore} notify={notify}/>} 
        {screen==="more"&&<More store={store} setStore={setStore} edit={edit} notify={notify}/>} 
      </div>
      <button className="fab" onClick={()=>edit("transaction")} aria-label="Agregar movimiento">＋</button>
      <nav className="bottom-nav">{nav.map(n=><button key={n.id} className={screen===n.id?"active":""} onClick={()=>setScreen(n.id)}><i>{n.icon}</i><span>{n.label}</span></button>)}</nav>
    </section>
    {editor&&<EditorModal editor={editor} store={store} save={saveEntity} close={()=>setEditor(null)} askDelete={()=>setDeleteTarget(editor)}/>} 
    {deleteTarget&&<ConfirmModal close={()=>setDeleteTarget(null)} confirm={confirmDelete}/>} 
    {toast&&<div className="toast"><b>✓</b>{toast}</div>}
  </main>
}

function Dashboard({store,summary,money:fmt,edit,go}:{store:Store;summary:any;money:(n:number)=>string;edit:(k:any,id?:string)=>void;go:(s:Screen)=>void}){
  const pending=store.transactions.filter(t=>t.status==="pending").slice(0,3);
  const over=Math.max(0,summary.expense-summary.expensePlan);
  if(!store.transactions.length)return <div className="welcome-state"><div className="welcome-mark">MB</div><small>Tu espacio está listo</small><h2>Empieza con tus propios números</h2><p>Agrega tu primer ingreso o gasto, o importa varios movimientos desde un archivo Excel.</p><button onClick={()=>edit("transaction")}>＋ Agregar movimiento</button><button className="secondary" onClick={()=>go("more")}>↑ Importar Excel</button><span>Tus datos se guardan únicamente en este dispositivo.</span></div>;
  return <>
    <article className="hero"><small>Disponible este mes</small><h2>{fmt(summary.balance)}</h2><div className="hero-row"><span>Saldo proyectado</span><b>{fmt(summary.projected)}</b></div><div className="progress dark"><i style={{width:`${Math.min(100,summary.expense/Math.max(summary.expensePlan,1)*100)}%`}}/></div><div className="hero-row subtle"><span>Gastado: {Math.round(summary.expense/Math.max(summary.expensePlan,1)*100)}%</span><span>Quedan 9 días</span></div></article>
    <SectionTitle kicker="Un vistazo" title="Así va tu mes" action="Ver detalle" onClick={()=>go("reports")}/>
    <div className="metric-grid"><Metric icon="↗" label="Ingresos" value={fmt(summary.income)} note={`${summary.income>=summary.incomePlan?"Meta superada":"Por recibir"}`}/><Metric icon="↘" label="Gastos" value={fmt(summary.expense)} note={over?`${fmt(over)} sobre plan`:"Dentro del plan"} warn={!!over}/></div>
    {over>0&&<article className="insight"><i>✦</i><div><small>Hallazgo del mes</small><h3>Tu presupuesto se movió</h3><p>Los gastos extraordinarios explican buena parte del excedente. Abre cada registro para corregirlo o reclasificarlo.</p><button onClick={()=>go("budget")}>Entender por qué →</button></div></article>}
    <SectionTitle kicker="Próximamente" title="Pagos por hacer" action={`${pending.length} pendientes`}/>
    <div className="list-card">{pending.length?pending.map(t=><button className="row" key={t.id} onClick={()=>edit("transaction",t.id)}><i className="row-icon">⌁</i><span><b>{t.description}</b><small>{dateLabel(t.date)} · {t.area}</small></span><strong>{fmt(t.amount)}</strong><em>Editar</em></button>):<Empty text="No tienes pagos pendientes"/>}</div>
  </>
}

function Transactions({store,filter,setFilter,search,setSearch,edit}:{store:Store;filter:string;setFilter:(v:string)=>void;search:string;setSearch:(v:string)=>void;edit:(k:any,id?:string)=>void}){
  const list=store.transactions.filter(t=>(filter==="all"||filter===t.type||filter===t.status)&&`${t.description} ${t.area} ${t.category}`.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>b.date.localeCompare(a.date));
  return <><div className="chips">{[["all","Todos"],["income","Ingresos"],["expense","Gastos"],["pending","Pendientes"]].map(([id,label])=><button key={id} className={filter===id?"active":""} onClick={()=>setFilter(id)}>{label}</button>)}</div>
    <label className="search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar movimiento"/></label>
    <div className="section-line"><span>{list.length} movimientos</span><button onClick={()=>edit("transaction")}>＋ Agregar</button></div>
    <div className="list-card movements">{list.length?list.map(t=><button className="row" key={t.id} onClick={()=>edit("transaction",t.id)}><i className={`row-icon ${t.type}`}>{t.type==="income"?"↗":"↘"}</i><span><b>{t.description}</b><small>{dateLabel(t.date)} · {t.area} · {t.category}</small></span><strong className={t.type}>{t.type==="income"?"+":"−"}{money(t.amount)}</strong><em>{t.status==="pending"?"Pendiente":"Editar"}</em></button>):<Empty text="No encontramos movimientos"/>}</div></>
}

function Budgets({store,edit}:{store:Store;edit:(k:any,id?:string)=>void}){
  const [tab,setTab]=useState<TxType>("expense");
  const actual=(b:Budget)=>store.transactions.filter(t=>t.type===b.kind&&t.area===b.area&&t.category===b.category&&t.status==="paid").reduce((s,t)=>s+t.amount,0);
  const items=store.budgets.filter(b=>b.kind===tab);const planned=items.reduce((s,b)=>s+b.planned,0);const used=items.reduce((s,b)=>s+actual(b),0);
  return <><article className="budget-hero"><div><small>Plan mensual</small><h2>{money(planned)}</h2><span>{tab==="expense"?"presupuestado para gastos":"meta de ingresos"}</span></div><div className="ring"><b>{Math.round(used/Math.max(planned,1)*100)}%</b><small>{tab==="expense"?"usado":"logrado"}</small></div></article>
    <div className="tabs"><button className={tab==="expense"?"active":""} onClick={()=>setTab("expense")}>Gastos</button><button className={tab==="income"?"active":""} onClick={()=>setTab("income")}>Ingresos</button></div>
    <div className="budget-list">{items.map(b=>{const real=actual(b),pct=Math.round(real/Math.max(b.planned,1)*100);return <button className="budget-item" key={b.id} onClick={()=>edit("budget",b.id)}><div className="budget-head"><i>{b.area.slice(0,1)}</i><span><b>{b.category}</b><small>{b.area}</small></span><strong>{money(real)} <small>/ {money(b.planned)}</small></strong></div><div className="progress"><i className={pct>100?"over":""} style={{width:`${Math.min(100,pct)}%`}}/></div><div className="budget-foot"><span>{pct}% {tab==="expense"?"utilizado":"de la meta"}</span><b>{pct>100?`+${money(real-b.planned)}`:`${money(b.planned-real)} restantes`}</b></div></button>})}</div>
    <button className="outline-btn" onClick={()=>edit("budget")}>＋ Agregar partida de presupuesto</button></>
}

function Reports({store,summary,setStore,notify}:{store:Store;summary:any;setStore:any;notify:(s:string)=>void}){
  const expenseAreas=store.areas.map(area=>({area,total:store.transactions.filter(t=>t.type==="expense"&&t.area===area&&t.status==="paid").reduce((s,t)=>s+t.amount,0)})).sort((a,b)=>b.total-a.total);
  const exportCsv=()=>{const head=["Fecha","Tipo","Descripción","Área","Categoría","Estado","Monto","Notas"];const rows=store.transactions.map(t=>[t.date,t.type,t.description,t.area,t.category,t.status,t.amount,t.notes]);download("mi-balance-julio-2026.csv","\ufeff"+[head,...rows].map(r=>r.map(x=>`"${String(x).replaceAll('"','""')}"`).join(",")).join("\n"),"text/csv");notify("Archivo de Excel preparado")};
  return <><article className="result"><small>Resultado del mes</small><h2>+{money(summary.balance)}</h2><b>Superávit</b><p>Ingresaste más de lo que gastaste. Todas las cifras se recalculan cuando editas un movimiento.</p></article>
    <SectionTitle kicker="Comparativo" title="Ingresos vs. gastos"/>
    <article className="compare"><div><span>Ingresos</span><strong>{money(summary.income)}</strong><i style={{width:"100%"}}/></div><div><span>Gastos</span><strong>{money(summary.expense)}</strong><i className="peach" style={{width:`${Math.min(100,summary.expense/Math.max(summary.income,1)*100)}%`}}/></div></article>
    <SectionTitle kicker="Composición" title="Gastos por área"/>
    <div className="area-list">{expenseAreas.map((a,i)=><div key={a.area}><i style={{opacity:1-i*.14}}>{a.area.slice(0,1)}</i><span><b>{a.area}</b><small>{summary.expense?Math.round(a.total/summary.expense*100):0}% del total</small></span><strong>{money(a.total)}</strong></div>)}</div>
    <SectionTitle kicker="Cierre mensual" title="Comentario editable"/>
    <textarea className="note" value={store.monthlyNote} onChange={e=>setStore((p:Store)=>({...p,monthlyNote:e.target.value}))}/>
    <div className="action-grid"><button onClick={exportCsv}>Exportar Excel</button><button onClick={()=>window.print()}>Guardar PDF</button></div></>
}

function More({store,setStore,edit,notify}:{store:Store;setStore:any;edit:(k:any,id?:string)=>void;notify:(s:string)=>void}){
  const [panel,setPanel]=useState<"profile"|"import"|"debts"|"recurring">(store.transactions.length?"profile":"import");
  const [profile,setProfile]=useState<Profile>(store.profile);
  const importBackup=(e:ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const value=JSON.parse(String(reader.result));if(!value.transactions||!value.budgets)throw new Error();setStore(normalizeStore(value));setProfile(normalizeStore(value).profile);notify("Copia restaurada")}catch{notify("El archivo no es una copia válida")}};reader.readAsText(file);e.target.value=""};
  const importWorkbook=async(e:ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];if(!file)return;
    try{
      const workbook=XLSX.read(await file.arrayBuffer(),{type:"array"});
      const sheet=workbook.Sheets[workbook.SheetNames[0]];
      if(!sheet)throw new Error("El archivo no contiene hojas");
      const rows=XLSX.utils.sheet_to_json<Record<string,unknown>>(sheet,{defval:""});
      const imported=rows.map(workbookRowToTransaction).filter((item):item is Transaction=>Boolean(item));
      if(!imported.length)throw new Error("No encontramos movimientos válidos");
      setStore((prev:Store)=>({
        ...prev,
        transactions:[...imported,...prev.transactions],
        areas:Array.from(new Set([...prev.areas,...imported.map(item=>item.area)])),
        categories:Array.from(new Set([...prev.categories,...imported.map(item=>item.category)])),
        audit:[{id:uid(),at:new Date().toISOString(),action:"Importó",detail:`${imported.length} movimientos desde ${file.name}`},...prev.audit].slice(0,50)
      }));
      notify(`${imported.length} movimientos importados`);
    }catch(error){notify(error instanceof Error?error.message:"No pudimos leer el archivo")}
    e.target.value="";
  };
  const backup=()=>{download("mi-balance-respaldo.json",JSON.stringify(store,null,2),"application/json");notify("Copia de seguridad descargada")};
  const reset=()=>{if(confirm("¿Borrar todos tus datos de este dispositivo? Esta acción no se puede deshacer.")){const empty=cloneInitial();empty.profile=store.profile;setStore(empty);notify("Datos borrados")}};
  const saveProfile=(e:FormEvent)=>{e.preventDefault();const clean={name:profile.name.trim()||"Mi perfil",email:profile.email.trim()};setProfile(clean);setStore((prev:Store)=>({...prev,profile:clean,audit:[{id:uid(),at:new Date().toISOString(),action:"Editó",detail:"Información del perfil"},...prev.audit].slice(0,50)}));notify("Perfil actualizado")};
  return <><button className="profile profile-button" onClick={()=>setPanel("profile")}><div className="avatar large">{initials(store.profile.name)}</div><span><b>{store.profile.name}</b><small>{store.profile.email||"Completa la información de tu perfil"}</small></span><em>Editar →</em></button>
    <div className="settings-menu">
      <button className={panel==="profile"?"active":""} onClick={()=>setPanel("profile")}><i>◎</i><span>Mi perfil</span></button>
      <button className={panel==="import"?"active":""} onClick={()=>setPanel("import")}><i>↑</i><span>Importar datos</span></button>
      <button className={panel==="debts"?"active":""} onClick={()=>setPanel("debts")}><i>▣</i><span>Deudas</span></button>
      <button className={panel==="recurring"?"active":""} onClick={()=>setPanel("recurring")}><i>↻</i><span>Recurrentes</span></button>
    </div>
    {panel==="profile"&&<form className="settings-panel" onSubmit={saveProfile}><h3>Información del perfil</h3><p>Estos datos solo se guardan en este dispositivo.</p><Field label="Nombre"><input value={profile.name} onChange={e=>setProfile(prev=>({...prev,name:e.target.value}))} placeholder="Tu nombre"/></Field><Field label="Correo (opcional)"><input type="email" value={profile.email} onChange={e=>setProfile(prev=>({...prev,email:e.target.value}))} placeholder="tu@correo.com"/></Field><button className="primary-setting" type="submit">Guardar perfil</button></form>}
    {panel==="import"&&<div className="settings-panel"><h3>Importar movimientos</h3><p>Sube un archivo Excel o CSV. La primera fila debe incluir: <b>Fecha, Tipo, Descripción y Monto</b>. También puedes incluir Área, Categoría, Estado y Notas.</p><label className="import-drop"><i>↑</i><b>Elegir Excel o CSV</b><small>.xlsx, .xls o .csv</small><input type="file" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" onChange={importWorkbook}/></label><div className="data-divider"><span>Copias de seguridad</span></div><button onClick={backup}>↓ Descargar copia completa</button><label className="secondary-upload">↑ Restaurar copia JSON<input type="file" accept="application/json" onChange={importBackup}/></label><button className="danger-text" onClick={reset}>Borrar todos mis datos</button><EditableTags title="Áreas" field="areas" store={store} setStore={setStore} notify={notify}/><EditableTags title="Categorías" field="categories" store={store} setStore={setStore} notify={notify}/><div className="history"><h3>Actividad reciente</h3>{store.audit.length?store.audit.slice(0,8).map(a=><div key={a.id}><b>{a.action}</b><span>{a.detail}</span><small>{new Date(a.at).toLocaleString("es-MX")}</small></div>):<Empty text="Los cambios que hagas aparecerán aquí"/>}</div></div>}
    {panel==="debts"&&<><div className="section-line"><span>{store.debts.length} deudas activas</span><button onClick={()=>edit("debt")}>＋ Agregar</button></div><div className="list-card">{store.debts.map(d=><button className="row" key={d.id} onClick={()=>edit("debt",d.id)}><i className="row-icon">▣</i><span><b>{d.name}</b><small>Saldo {money(d.balance)} · vence el {d.dueDay}</small></span><strong>{money(d.paid)} / {money(d.plannedPayment)}</strong><em>Editar</em></button>)}</div></>}
    {panel==="recurring"&&<><div className="section-line"><span>{store.recurring.length} programados</span><button onClick={()=>edit("recurring")}>＋ Agregar</button></div><div className="list-card">{store.recurring.map(r=><button className="row" key={r.id} onClick={()=>edit("recurring",r.id)}><i className="row-icon">↻</i><span><b>{r.name}</b><small>{r.frequency} · {dateLabel(r.nextDate)} · {r.area}</small></span><strong>{money(r.amount)}</strong><em>{r.active?"Activo":"Pausado"}</em></button>)}</div></>}
  </>
}

function EditorModal({editor,store,save,close,askDelete}:{editor:NonNullable<Editor>;store:Store;save:(k:any,v:any,id?:string)=>void;close:()=>void;askDelete:()=>void}){
  const source:any=editor.kind==="transaction"?store.transactions:editor.kind==="budget"?store.budgets:editor.kind==="debt"?store.debts:store.recurring;
  const found=editor.id?source.find((x:any)=>x.id===editor.id):null;
  const defaults:any=editor.kind==="transaction"?{type:"expense",date:today,description:"",area:store.areas[0],category:store.categories[0],amount:0,status:"paid",notes:""}:editor.kind==="budget"?{kind:"expense",area:store.areas[0],category:store.categories[0],planned:0}:editor.kind==="debt"?{name:"",balance:0,plannedPayment:0,paid:0,dueDay:1}:{name:"",amount:0,frequency:"Mensual",nextDate:today,area:store.areas[0],active:true};
  const [form,setForm]=useState<any>(found||defaults);const set=(key:string,value:any)=>setForm((p:any)=>({...p,[key]:value}));
  const submit=(e:FormEvent)=>{e.preventDefault();save(editor.kind,form,editor.id)};
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><form className="modal" onSubmit={submit}><div className="handle"/><header><div><small>{editor.id?"Editar":"Nuevo registro"}</small><h2>{editorTitle(editor.kind)}</h2></div><button type="button" onClick={close}>×</button></header>
    {editor.kind==="transaction"&&<><div className="segmented"><button type="button" className={form.type==="expense"?"active":""} onClick={()=>set("type","expense")}>Gasto</button><button type="button" className={form.type==="income"?"active":""} onClick={()=>set("type","income")}>Ingreso</button></div><Field label="Descripción"><input required value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Ej. Supermercado"/></Field><div className="form-grid"><Field label="Monto"><input required min="0" step="0.01" type="number" value={form.amount||""} onChange={e=>set("amount",Number(e.target.value))}/></Field><Field label="Fecha"><input required type="date" value={form.date} onChange={e=>set("date",e.target.value)}/></Field><Field label="Área"><Select value={form.area} options={store.areas} onChange={v=>set("area",v)}/></Field><Field label="Categoría"><Select value={form.category} options={store.categories} onChange={v=>set("category",v)}/></Field><Field label="Estado"><Select value={form.status} options={["paid","pending"]} labels={["Pagado / cobrado","Pendiente"]} onChange={v=>set("status",v)}/></Field></div><Field label="Notas"><textarea value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="Detalles opcionales"/></Field></>}
    {editor.kind==="budget"&&<><div className="segmented"><button type="button" className={form.kind==="expense"?"active":""} onClick={()=>set("kind","expense")}>Gasto</button><button type="button" className={form.kind==="income"?"active":""} onClick={()=>set("kind","income")}>Ingreso</button></div><Field label="Monto presupuestado"><input required min="0" type="number" value={form.planned||""} onChange={e=>set("planned",Number(e.target.value))}/></Field><div className="form-grid"><Field label="Área"><Select value={form.area} options={store.areas} onChange={v=>set("area",v)}/></Field><Field label="Categoría"><Select value={form.category} options={store.categories} onChange={v=>set("category",v)}/></Field></div></>}
    {editor.kind==="debt"&&<><Field label="Nombre o acreedor"><input required value={form.name} onChange={e=>set("name",e.target.value)}/></Field><div className="form-grid"><Field label="Saldo actual"><input required min="0" type="number" value={form.balance||""} onChange={e=>set("balance",Number(e.target.value))}/></Field><Field label="Día de pago"><input required min="1" max="31" type="number" value={form.dueDay} onChange={e=>set("dueDay",Number(e.target.value))}/></Field><Field label="Pago planeado"><input required min="0" type="number" value={form.plannedPayment||""} onChange={e=>set("plannedPayment",Number(e.target.value))}/></Field><Field label="Pago realizado"><input required min="0" type="number" value={form.paid||""} onChange={e=>set("paid",Number(e.target.value))}/></Field></div></>}
    {editor.kind==="recurring"&&<><Field label="Concepto"><input required value={form.name} onChange={e=>set("name",e.target.value)}/></Field><div className="form-grid"><Field label="Monto"><input required min="0" type="number" value={form.amount||""} onChange={e=>set("amount",Number(e.target.value))}/></Field><Field label="Próxima fecha"><input required type="date" value={form.nextDate} onChange={e=>set("nextDate",e.target.value)}/></Field><Field label="Frecuencia"><Select value={form.frequency} options={["Semanal","Quincenal","Mensual","Bimestral","Anual"]} onChange={v=>set("frequency",v)}/></Field><Field label="Área"><Select value={form.area} options={store.areas} onChange={v=>set("area",v)}/></Field></div><label className="switch"><input type="checkbox" checked={form.active} onChange={e=>set("active",e.target.checked)}/><span/>Registro activo</label></>}
    <div className="modal-actions">{editor.id&&<button type="button" className="delete-btn" onClick={askDelete}>Eliminar</button>}<button className="save-btn" type="submit">Guardar cambios</button></div>
  </form></div>
}

function ConfirmModal({close,confirm}:{close:()=>void;confirm:()=>void}){return <div className="modal-backdrop"><div className="confirm"><i>!</i><h2>¿Eliminar este registro?</h2><p>Se quitará de tus cálculos y reportes. Esta acción quedará anotada en la actividad reciente.</p><div><button onClick={close}>Cancelar</button><button onClick={confirm}>Sí, eliminar</button></div></div></div>}
function normalizeHeader(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase().replace(/\s+/g,"_")}
function parseWorkbookDate(value:unknown){
  if(typeof value==="number"){const date=new Date(Math.round((value-25569)*86400*1000));return Number.isNaN(date.getTime())?today:date.toISOString().slice(0,10)}
  const text=String(value||"").trim();if(!text)return today;
  const latin=text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);if(latin)return `${latin[3]}-${latin[2].padStart(2,"0")}-${latin[1].padStart(2,"0")}`;
  const date=new Date(text);return Number.isNaN(date.getTime())?today:date.toISOString().slice(0,10);
}
function parseWorkbookAmount(value:unknown){const normalized=String(value??"").replace(/[^\d,.-]/g,"").replace(/,(?=\d{1,2}$)/,".").replace(/,/g,"");return Number(normalized)}
function workbookRowToTransaction(row:Record<string,unknown>):Transaction|null{
  const data=Object.fromEntries(Object.entries(row).map(([key,value])=>[normalizeHeader(key),value]));
  const description=String(data.descripcion??data.description??data.concepto??"").trim();
  const rawAmount=data.monto??data.importe??data.amount??data.cantidad;
  const amount=parseWorkbookAmount(rawAmount);
  if(!description||!Number.isFinite(amount)||amount===0)return null;
  const rawType=normalizeHeader(String(data.tipo??data.type??""));
  const expense=amount<0||["gasto","egreso","expense","cargo"].some(value=>rawType.includes(value));
  const rawStatus=normalizeHeader(String(data.estado??data.status??""));
  return{id:uid(),type:expense?"expense":"income",date:parseWorkbookDate(data.fecha??data.date),description,area:String(data.area??"Otros").trim()||"Otros",category:String(data.categoria??data.category??"Otros").trim()||"Otros",amount:Math.abs(amount),status:rawStatus.includes("pend")?"pending":"paid",notes:String(data.notas??data.notes??"").trim()};
}
function EditableTags({title,field,store,setStore,notify}:{title:string;field:"areas"|"categories";store:Store;setStore:any;notify:(s:string)=>void}){
  const singular=title==="Áreas"?"área":"categoría";
  const add=()=>{const value=prompt(`Nueva ${singular}`)?.trim();if(!value)return;if(store[field].some(x=>x.toLowerCase()===value.toLowerCase())){notify("Ese nombre ya existe");return}setStore((p:Store)=>({...p,[field]:[...p[field],value],audit:[{id:uid(),at:new Date().toISOString(),action:"Creó",detail:`${singular}: ${value}`},...p.audit]}));notify("Lista actualizada")};
  const rename=(old:string)=>{const value=prompt(`Editar ${singular}`,old)?.trim();if(!value||value===old)return;setStore((p:Store)=>({...p,[field]:p[field].map(x=>x===old?value:x),transactions:p.transactions.map(t=>field==="areas"&&t.area===old?{...t,area:value}:field==="categories"&&t.category===old?{...t,category:value}:t),budgets:p.budgets.map(b=>field==="areas"&&b.area===old?{...b,area:value}:field==="categories"&&b.category===old?{...b,category:value}:b),recurring:p.recurring.map(r=>field==="areas"&&r.area===old?{...r,area:value}:r),audit:[{id:uid(),at:new Date().toISOString(),action:"Editó",detail:`${singular}: ${old} → ${value}`},...p.audit]}));notify("Nombre actualizado")};
  return <div className="tag-editor"><div><h3>{title}</h3><button onClick={add}>＋ Agregar</button></div><p>Toca un nombre para editarlo. Los registros relacionados se actualizarán también.</p><section>{store[field].map(value=><button key={value} onClick={()=>rename(value)}>{value} <i>✎</i></button>)}</section></div>
}
function Field({label,children}:{label:string;children:any}){return <label className="field"><span>{label}</span>{children}</label>}
function Select({value,options,labels,onChange}:{value:string;options:string[];labels?:string[];onChange:(v:string)=>void}){return <select value={value} onChange={e=>onChange(e.target.value)}>{options.map((o,i)=><option key={o} value={o}>{labels?.[i]||o}</option>)}</select>}
function Metric({icon,label,value,note,warn}:{icon:string;label:string;value:string;note:string;warn?:boolean}){return <article className="metric"><i>{icon}</i><small>{label}</small><strong>{value}</strong><span className={warn?"warn":""}>{note}</span></article>}
function SectionTitle({kicker,title,action,onClick}:{kicker:string;title:string;action?:string;onClick?:()=>void}){return <div className="section-title"><div><small>{kicker}</small><h2>{title}</h2></div>{action&&(onClick?<button onClick={onClick}>{action}</button>:<span>{action}</span>)}</div>}
function Empty({text}:{text:string}){return <div className="empty"><i>○</i><span>{text}</span></div>}
function labelKind(k:string){return({transaction:"Movimiento",budget:"Presupuesto",debt:"Deuda",recurring:"Recurrente"} as any)[k]}
function editorTitle(k:string){return({transaction:"Movimiento",budget:"Partida de presupuesto",debt:"Deuda",recurring:"Gasto recurrente"} as any)[k]}
function screenTitle(s:Screen){return({home:new Intl.DateTimeFormat("es-MX",{month:"long",year:"numeric"}).format(new Date()),transactions:"Movimientos",budget:"Presupuesto",reports:"Reportes",more:"Ajustes"})[s]}
function download(name:string,content:string,type:string){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

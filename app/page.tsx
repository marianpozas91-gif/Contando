/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

type TxType = "income" | "expense";
type TxStatus = "paid" | "pending";
type Transaction = { id:string; type:TxType; date:string; description:string; area:string; category:string; amount:number; status:TxStatus; notes:string };
type Budget = { id:string; kind:TxType; area:string; category:string; planned:number };
type Debt = { id:string; name:string; balance:number; plannedPayment:number; paid:number; dueDay:number };
type Recurring = { id:string; name:string; amount:number; frequency:string; nextDate:string; area:string; active:boolean };
type Audit = { id:string; at:string; action:string; detail:string };
type Store = { transactions:Transaction[]; budgets:Budget[]; debts:Debt[]; recurring:Recurring[]; areas:string[]; categories:string[]; monthlyNote:string; audit:Audit[] };
type Editor = { kind:"transaction"|"budget"|"debt"|"recurring"; id?:string } | null;
type Screen = "home"|"transactions"|"budget"|"reports"|"more";

const uid=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
const today="2026-07-22";
const initial:Store={
  transactions:[
    {id:"t1",type:"income",date:"2026-07-19",description:"Reservación Airbnb",area:"Airbnb",category:"Reservaciones",amount:25200,status:"paid",notes:"Ingreso neto del mes"},
    {id:"t2",type:"income",date:"2026-07-21",description:"Sesiones de terapia",area:"Terapia",category:"Sesiones",amount:28000,status:"paid",notes:"31 sesiones cobradas"},
    {id:"t3",type:"expense",date:"2026-07-22",description:"Supermercado",area:"Hogar",category:"Alimentación",amount:9440,status:"paid",notes:"Compras acumuladas"},
    {id:"t4",type:"expense",date:"2026-07-18",description:"Mantenimiento Airbnb",area:"Airbnb",category:"Mantenimiento",amount:10850,status:"paid",notes:"Incluye reparación de calentador"},
    {id:"t5",type:"expense",date:"2026-07-15",description:"Pagos de deudas",area:"Personal",category:"Deudas",amount:7200,status:"paid",notes:"BBVA y crédito personal"},
    {id:"t6",type:"expense",date:"2026-07-25",description:"Internet hogar",area:"Hogar",category:"Servicios",amount:650,status:"pending",notes:"Pago recurrente"},
    {id:"t7",type:"expense",date:"2026-07-28",description:"Luz Airbnb",area:"Airbnb",category:"Servicios",amount:890,status:"pending",notes:"Monto estimado"}
  ],
  budgets:[
    {id:"b1",kind:"income",area:"Airbnb",category:"Reservaciones",planned:28000},
    {id:"b2",kind:"income",area:"Terapia",category:"Sesiones",planned:25000},
    {id:"b3",kind:"expense",area:"Airbnb",category:"Mantenimiento",planned:8500},
    {id:"b4",kind:"expense",area:"Hogar",category:"Alimentación",planned:12000},
    {id:"b5",kind:"expense",area:"Personal",category:"Deudas",planned:8000},
    {id:"b6",kind:"expense",area:"Hogar",category:"Servicios",planned:4100}
  ],
  debts:[
    {id:"d1",name:"Tarjeta BBVA",balance:18400,plannedPayment:4200,paid:4200,dueDay:25},
    {id:"d2",name:"Crédito personal",balance:32000,plannedPayment:3000,paid:3000,dueDay:15},
    {id:"d3",name:"Tienda departamental",balance:6800,plannedPayment:800,paid:0,dueDay:29}
  ],
  recurring:[
    {id:"r1",name:"Internet hogar",amount:650,frequency:"Mensual",nextDate:"2026-07-25",area:"Hogar",active:true},
    {id:"r2",name:"Luz Airbnb",amount:890,frequency:"Bimestral",nextDate:"2026-07-28",area:"Airbnb",active:true},
    {id:"r3",name:"Seguro del auto",amount:1450,frequency:"Mensual",nextDate:"2026-08-02",area:"Personal",active:true}
  ],
  areas:["Hogar","Airbnb","Terapia","Personal"],
  categories:["Alimentación","Deudas","Mantenimiento","Reservaciones","Servicios","Sesiones","Transporte","Otros"],
  monthlyNote:"Julio cerró con un resultado positivo. La reparación de Airbnb elevó el gasto, pero los ingresos de terapia compensaron la diferencia.",
  audit:[]
};

const money=(value:number)=>new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(value);
const dateLabel=(value:string)=>new Intl.DateTimeFormat("es-MX",{day:"numeric",month:"short"}).format(new Date(`${value}T12:00:00`));
const cloneInitial=():Store=>JSON.parse(JSON.stringify(initial));

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
    try{const saved=localStorage.getItem("mi-balance-v1");if(saved)setStore(JSON.parse(saved));}catch{}
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
    {id:"home",label:"Inicio",icon:"⌂"},{id:"transactions",label:"Movimientos",icon:"≡"},{id:"budget",label:"Presupuesto",icon:"▥"},{id:"reports",label:"Reportes",icon:"◔"},{id:"more",label:"Más",icon:"•••"}
  ];
  return <main className="app-shell">
    <aside className="desktop-brand"><div className="logo">MB</div><h1>Mi Balance</h1><p>Tu dinero, claro y en calma.</p><small>Los datos se guardan únicamente en este dispositivo.</small></aside>
    <section className="phone">
      <header className="topbar"><div className="avatar">LM</div><div><small>{screen==="reports"?"Tu historia financiera":"Mi balance"}</small><strong>{screenTitle(screen)}</strong></div><button className="icon-btn" onClick={()=>setShowAmounts(v=>!v)} aria-label={showAmounts?"Ocultar cantidades":"Mostrar cantidades"}>{showAmounts?"◉":"○"}</button></header>
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
  const [panel,setPanel]=useState<"debts"|"recurring"|"data">("debts");
  const importFile=(e:ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const value=JSON.parse(String(reader.result));if(!value.transactions||!value.budgets)throw new Error();setStore(value);notify("Copia restaurada")}catch{notify("El archivo no es una copia válida")}};reader.readAsText(file)};
  const backup=()=>{download("mi-balance-respaldo.json",JSON.stringify(store,null,2),"application/json");notify("Copia de seguridad descargada")};
  const reset=()=>{if(confirm("¿Restaurar los datos de demostración? Se reemplazarán tus cambios actuales.")){setStore(cloneInitial());notify("Datos restaurados")}};
  return <><article className="profile"><div className="avatar large">LM</div><span><b>Lucía Martínez</b><small>Datos guardados en este dispositivo</small></span></article>
    <div className="tabs triple"><button className={panel==="debts"?"active":""} onClick={()=>setPanel("debts")}>Deudas</button><button className={panel==="recurring"?"active":""} onClick={()=>setPanel("recurring")}>Recurrentes</button><button className={panel==="data"?"active":""} onClick={()=>setPanel("data")}>Datos</button></div>
    {panel==="debts"&&<><div className="section-line"><span>{store.debts.length} deudas activas</span><button onClick={()=>edit("debt")}>＋ Agregar</button></div><div className="list-card">{store.debts.map(d=><button className="row" key={d.id} onClick={()=>edit("debt",d.id)}><i className="row-icon">▣</i><span><b>{d.name}</b><small>Saldo {money(d.balance)} · vence el {d.dueDay}</small></span><strong>{money(d.paid)} / {money(d.plannedPayment)}</strong><em>Editar</em></button>)}</div></>}
    {panel==="recurring"&&<><div className="section-line"><span>{store.recurring.length} programados</span><button onClick={()=>edit("recurring")}>＋ Agregar</button></div><div className="list-card">{store.recurring.map(r=><button className="row" key={r.id} onClick={()=>edit("recurring",r.id)}><i className="row-icon">↻</i><span><b>{r.name}</b><small>{r.frequency} · {dateLabel(r.nextDate)} · {r.area}</small></span><strong>{money(r.amount)}</strong><em>{r.active?"Activo":"Pausado"}</em></button>)}</div></>}
    {panel==="data"&&<div className="data-panel"><h3>Control de tus datos</h3><p>Tu información vive en este navegador. Descarga una copia regularmente para poder restaurarla en otro dispositivo.</p><button onClick={backup}>↓ Descargar copia de seguridad</button><label>↑ Restaurar copia<input type="file" accept="application/json" onChange={importFile}/></label><button className="danger-text" onClick={reset}>Restaurar datos de demostración</button><EditableTags title="Áreas" field="areas" store={store} setStore={setStore} notify={notify}/><EditableTags title="Categorías" field="categories" store={store} setStore={setStore} notify={notify}/><div className="history"><h3>Actividad reciente</h3>{store.audit.length?store.audit.slice(0,8).map(a=><div key={a.id}><b>{a.action}</b><span>{a.detail}</span><small>{new Date(a.at).toLocaleString("es-MX")}</small></div>):<Empty text="Los cambios que hagas aparecerán aquí"/>}</div></div>}
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
function screenTitle(s:Screen){return({home:"Julio 2026",transactions:"Movimientos",budget:"Presupuesto",reports:"Reportes",more:"Organiza tu cuenta"})[s]}
function download(name:string,content:string,type:string){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

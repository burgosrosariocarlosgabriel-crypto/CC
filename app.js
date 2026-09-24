const KEY="stock_pos_v2";

let data=loadData();

function defaultData(){
  return {
    openingCash:0,
    products:[],
    purchases:[],
    sales:[],
    expenses:[],
    adjustments:[]
  };
}
function loadData(){
  try{
    const x=JSON.parse(localStorage.getItem(KEY));
    if(x){
      x.adjustments=x.adjustments||[];
      x.products=x.products||[];
      x.purchases=x.purchases||[];
      x.sales=x.sales||[];
      x.expenses=x.expenses||[];
      return x;
    }
  }catch(e){}
  return defaultData();
}
function saveData(){localStorage.setItem(KEY,JSON.stringify(data));refreshAll()}
function money(n){return "RD$"+Number(n||0).toLocaleString("es-DO",{minimumFractionDigits:2,maximumFractionDigits:2})}
function today(){return new Date().toLocaleString("es-DO")}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function productById(id){return data.products.find(p=>p.id===id)}
function stockOf(id){
  let s=0;
  for(const p of data.purchases) if(p.productId===id) s+=Number(p.units);
  for(const v of data.sales) if(v.productId===id) s-=Number(v.qty);
  for(const a of data.adjustments) if(a.productId===id) s+=Number(a.qtySigned);
  return s;
}
function totalSales(){return data.sales.reduce((a,x)=>a+Number(x.total),0)}
function totalPurchases(){return data.purchases.reduce((a,x)=>a+Number(x.total),0)}
function totalExpenses(){return data.expenses.reduce((a,x)=>a+Number(x.amount),0)}
function currentCash(){return Number(data.openingCash)+totalSales()-totalPurchases()-totalExpenses()}
function cogs(){return data.sales.reduce((a,x)=>a+Number(x.costTotal),0)}
function profit(){return totalSales()-cogs()-totalExpenses()}

function showScreen(id){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  const el=document.getElementById(id);
  if(el) el.classList.add("active");
  refreshAll();
  window.scrollTo({top:0,behavior:"smooth"});
}

function fillSelect(id,placeholder="Selecciona..."){
  const s=document.getElementById(id);
  if(!s)return;
  const old=s.value;
  s.innerHTML='<option value="">'+placeholder+'</option>';
  data.products.forEach(p=>{
    const o=document.createElement("option");
    o.value=p.id;o.textContent=p.name;
    s.appendChild(o);
  });
  if(data.products.some(p=>p.id===old))s.value=old;
}

function refreshAll(){
  fillSelect("saleProduct","Selecciona producto");
  fillSelect("purchaseProduct","Selecciona producto");
  fillSelect("adjustProduct","Selecciona producto");
  renderDashboard();renderProducts();renderInventory();renderHistory();
  updateSaleInfo();updatePurchaseInfo();updateAdjustmentInfo();renderCash();renderReports();
  const opening=document.getElementById("openingCash");if(opening)opening.value=data.openingCash||0;
}

function renderDashboard(){
  setText("dashSales",money(totalSales()));setText("dashPurchases",money(totalPurchases()));
  setText("dashExpenses",money(totalExpenses()));setText("dashCash",money(currentCash()));
}
function renderProducts(){
  const el=document.getElementById("productList");if(!el)return;
  if(!data.products.length){el.innerHTML='<div class="hint">No hay productos registrados.</div>';return}
  el.innerHTML=data.products.map(p=>`
    <div class="row">
      <div class="row-top"><span class="row-title">${esc(p.name)}</span><b>${money(p.price)}</b></div>
      <div class="muted">Costo: ${money(p.cost)} · Stock: ${stockOf(p.id)}</div>
      <div class="actions"><button onclick="editProduct('${p.id}')">Editar</button></div>
    </div>`).join("");
}
function renderInventory(){
  const el=document.getElementById("inventoryList");if(!el)return;
  if(!data.products.length){el.innerHTML='<div class="hint">Registra productos para ver el inventario.</div>';return}
  el.innerHTML=data.products.map(p=>`
    <div class="row">
      <div class="row-top"><span class="row-title">${esc(p.name)}</span><b>${stockOf(p.id)} und.</b></div>
      <div class="muted">Venta: ${money(p.price)} · Costo: ${money(p.cost)}</div>
    </div>`).join("");
}
function updateSaleInfo(){
  const p=productById(val("saleProduct"));const q=Number(val("saleQty")||0);
  setText("saleInfo",p?`Stock disponible: ${stockOf(p.id)} unidades · Total: ${money(p.price*q)}`:"Selecciona un producto.");
}
function updatePurchaseInfo(){
  const packs=Number(val("purchasePackages")||0),units=Number(val("purchaseUnitsPerPackage")||0),cost=Number(val("purchaseCost")||0);
  setText("purchaseInfo",`Entrarán al inventario: ${packs*units} unidades · Salida de caja: ${money(packs*cost)}`);
}
function updateAdjustmentInfo(){
  const p=productById(val("adjustProduct"));const q=Number(val("adjustQty")||0);const type=val("adjustType");
  if(!p){setText("adjustInfo","Selecciona un producto.");return}
  const current=stockOf(p.id);const next=type==="remove"?current-q:current+q;
  setText("adjustInfo",`Stock actual: ${current} · Nuevo stock: ${next}${type==="remove"&&q>current?" · No puedes eliminar más unidades de las disponibles.":""}`);
}

function registerSale(){
  const p=productById(val("saleProduct")),q=Number(val("saleQty"));
  if(!p||q<1)return alert("Selecciona un producto y una cantidad válida.");
  const stock=stockOf(p.id);
  if(q>stock)return alert(`No hay suficiente inventario. Disponible: ${stock}.`);
  data.sales.push({id:uid(),productId:p.id,qty:q,total:p.price*q,costTotal:p.cost*q,date:today()});
  saveData();alert("Venta registrada.");showScreen("sale");
  document.getElementById("saleQty").value=1;
}
function registerPurchase(){
  const p=productById(val("purchaseProduct")),packs=Number(val("purchasePackages")),units=Number(val("purchaseUnitsPerPackage")),cost=Number(val("purchaseCost"));
  if(!p||packs<1||units<1||cost<0)return alert("Completa correctamente los datos.");
  data.purchases.push({id:uid(),productId:p.id,packages:packs,unitsPerPackage:units,units:packs*units,costPerPackage:cost,total:packs*cost,date:today()});
  saveData();alert("Compra registrada.");showScreen("purchase");
}
function registerAdjustment(){
  const p=productById(val("adjustProduct")),q=Number(val("adjustQty")),type=val("adjustType");
  if(!p||q<1)return alert("Selecciona un producto y una cantidad válida.");
  const current=stockOf(p.id);
  if(type==="remove"&&q>current)return alert(`No puedes eliminar ${q} unidades. Solo hay ${current} disponibles.`);
  data.adjustments.push({id:uid(),productId:p.id,type,qty:q,qtySigned:type==="remove"?-q:q,date:today()});
  saveData();alert(type==="add"?"Stock agregado correctamente.":"Stock eliminado correctamente.");
  document.getElementById("adjustQty").value=1;showScreen("adjustment");
}
function registerExpense(){
  const d=val("expenseDescription").trim(),amount=Number(val("expenseAmount"));
  if(!d||amount<=0)return alert("Escribe una descripción y un monto válido.");
  data.expenses.push({id:uid(),description:d,amount,date:today()});
  saveData();alert("Gasto registrado.");
  document.getElementById("expenseDescription").value="";document.getElementById("expenseAmount").value="";
  showScreen("expense");
}
function saveOpeningCash(){
  const n=Number(val("openingCash"));if(n<0)return alert("Monto inválido.");
  data.openingCash=n;saveData();alert("Dinero inicial guardado.");
}
function openProductForm(){
  document.getElementById("editingProductId").value="";
  document.getElementById("productFormTitle").textContent="Registrar producto";
  document.getElementById("productName").value="";
  document.getElementById("productPrice").value="";
  document.getElementById("productCost").value="";
  showScreen("productForm");
}
function editProduct(id){
  const p=productById(id);if(!p)return;
  document.getElementById("editingProductId").value=id;
  document.getElementById("productFormTitle").textContent="Editar producto";
  document.getElementById("productName").value=p.name;
  document.getElementById("productPrice").value=p.price;
  document.getElementById("productCost").value=p.cost;
  showScreen("productForm");
}
function saveProduct(){
  const id=val("editingProductId"),name=val("productName").trim(),price=Number(val("productPrice")),cost=Number(val("productCost"));
  if(!name||price<0||cost<0)return alert("Completa los datos correctamente.");
  if(id){
    const p=productById(id);p.name=name;p.price=price;p.cost=cost;
  }else data.products.push({id:uid(),name,price,cost});
  saveData();alert("Producto guardado.");showScreen("products");
}
function renderCash(){setText("cashCurrent",money(currentCash()))}
function renderReports(){
  setText("repSales",money(totalSales()));setText("repCOGS",money(cogs()));
  setText("repExpenses",money(totalExpenses()));setText("repProfit",money(profit()));
}
function renderHistory(){
  const el=document.getElementById("historyList");if(!el)return;
  const all=[];
  data.sales.forEach(x=>{const p=productById(x.productId);all.push({date:x.date,title:"Venta",detail:`${x.qty} × ${p?p.name:"Producto"}`,amount:x.total,cls:"cash-in"})});
  data.purchases.forEach(x=>{const p=productById(x.productId);all.push({date:x.date,title:"Compra",detail:`${x.units} × ${p?p.name:"Producto"}`,amount:-x.total,cls:"cash-out"})});
  data.expenses.forEach(x=>all.push({date:x.date,title:"Gasto",detail:x.description,amount:-x.amount,cls:"cash-out"}));
  data.adjustments.forEach(x=>{const p=productById(x.productId);all.push({date:x.date,title:x.type==="add"?"Entrada de inventario":"Salida de inventario",detail:`${x.type==="add"?"+":"-"}${x.qty} × ${p?p.name:"Producto"} · Sin movimiento de caja`,amount:null,cls:""})});
  all.reverse();
  el.innerHTML=all.length?all.map(x=>`<div class="row"><div class="row-top"><span class="row-title">${x.title}</span><span>${x.amount===null?"":money(x.amount)}</span></div><div class="muted">${esc(x.detail)} · ${esc(x.date)}</div></div>`).join(""):'<div class="hint">Todavía no hay movimientos.</div>';
}
function setText(id,text){const e=document.getElementById(id);if(e)e.textContent=text}
function val(id){return document.getElementById(id)?.value||""}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

["saleProduct","saleQty"].forEach(id=>document.getElementById(id)?.addEventListener("input",updateSaleInfo));
["purchasePackages","purchaseUnitsPerPackage","purchaseCost"].forEach(id=>document.getElementById(id)?.addEventListener("input",updatePurchaseInfo));
document.addEventListener("DOMContentLoaded",refreshAll);

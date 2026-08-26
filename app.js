const KEY="kombi_ustasi_v2_data";
const emptyData={customers:[],parts:[],appointments:[]};
let data=loadData(), currentDate=new Date(), selectedDate=isoDate(new Date()), modalEl=document.getElementById("modal");

function loadData(){try{return Object.assign({},emptyData,JSON.parse(localStorage.getItem(KEY))||{})}catch(e){return {...emptyData}}}
function save(){localStorage.setItem(KEY,JSON.stringify(data))}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function isoDate(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function money(n){return new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:2}).format(Number(n)||0)}
function fmtDate(s){return new Date(s+"T00:00:00").toLocaleDateString("tr-TR",{day:"numeric",month:"long",year:"numeric"})}
function toast(t){let x=document.getElementById("toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),1800)}
function openModal(title,body){document.getElementById("modalTitle").textContent=title;document.getElementById("modalBody").innerHTML=body;modalEl.classList.remove("hidden")}
function closeModal(){modalEl.classList.add("hidden")}
document.getElementById("closeModal").onclick=closeModal;
modalEl.addEventListener("click",e=>{if(e.target===modalEl)closeModal()});

function renderCalendar(){
 const y=currentDate.getFullYear(),m=currentDate.getMonth();
 document.getElementById("monthTitle").textContent=new Date(y,m,1).toLocaleDateString("tr-TR",{month:"long",year:"numeric"});
 document.getElementById("calendarLabel").textContent="Bir güne dokun, randevularını gör.";
 const first=new Date(y,m,1), last=new Date(y,m+1,0), start=(first.getDay()+6)%7, days=last.getDate();
 let html="";
 for(let i=0;i<start;i++) html+=`<div class="day muted"></div>`;
 for(let d=1;d<=days;d++){
   const date=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
   const count=data.appointments.filter(a=>a.date===date).length;
   const today=date===isoDate(new Date())?"today":"",sel=date===selectedDate?"selected":"";
   html+=`<div class="day ${today} ${sel}" data-date="${date}"><div class="num">${d}</div>${count?`<span class="dot"></span><small>${count}</small>`:""}</div>`;
 }
 document.getElementById("calendarGrid").innerHTML=html;
 document.querySelectorAll(".day[data-date]").forEach(x=>x.onclick=()=>{selectedDate=x.dataset.date;renderCalendar();renderDay()});
 renderDay();
}
function renderDay(){
 const list=data.appointments.filter(a=>a.date===selectedDate).sort((a,b)=>(a.time||"").localeCompare(b.time||""));
 document.getElementById("dayAppointments").innerHTML=`<h3>${fmtDate(selectedDate)}</h3>`+
 (list.length?list.map(a=>{let c=data.customers.find(x=>x.id===a.customerId);return `<div class="appointment"><div><div class="time">${esc(a.time||"--:--")}</div><strong>${esc(c?.name||a.customerName||"Müşteri silinmiş")}</strong><br><small>${esc(a.jobType||"İş belirtilmedi")} ${a.address?`· ${esc(a.address)}`:""}</small></div><div class="appointment-actions"><button onclick="editAppointment('${a.id}')">Düzenle</button><button onclick="deleteAppointment('${a.id}')">Sil</button></div></div>`}).join(""):`<div class="empty">Bu gün için randevu yok.</div>`);
}
document.getElementById("prevMonth").onclick=()=>{currentDate.setMonth(currentDate.getMonth()-1);renderCalendar()}
document.getElementById("nextMonth").onclick=()=>{currentDate.setMonth(currentDate.getMonth()+1);renderCalendar()}
document.getElementById("addAppointmentBtn").onclick=()=>appointmentForm(selectedDate);

function appointmentForm(date,id=null){
 const a=id?data.appointments.find(x=>x.id===id):null;
 if(!data.customers.length){toast("Önce müşteri oluştur.");showPage("customers");return}
 let selectedParts=a?.parts||[];
 openModal(id?"Randevuyu Düzenle":"Yeni Randevu",`
 <form class="form" id="appointmentForm">
 <label>Müşteri<select name="customerId" required>${data.customers.map(c=>`<option value="${c.id}" ${a?.customerId===c.id?"selected":""}>${esc(c.name)}</option>`).join("")}</select></label>
 <label>Tarih<input type="date" name="date" value="${a?.date||date}" required></label>
 <label>Saat<input type="time" name="time" value="${a?.time||""}"></label>
 <label>İş Türü<input name="jobType" placeholder="Örn. Kombi bakımı" value="${esc(a?.jobType||"")}"></label>
 <label>Adres<input name="address" placeholder="İş adresi" value="${esc(a?.address||"")}"></label>
 <label>İşçilik / Ücret (TL)<input type="number" step="0.01" name="labor" value="${a?.labor??""}" placeholder="0"></label>
 <label>Not<textarea name="note" placeholder="Notlar...">${esc(a?.note||"")}</textarea></label>
 <label>Parçalar</label><div class="parts-picker" id="picker">${partPickerHtml(selectedParts)}</div>
 <div class="total" id="formTotal">Toplam: ${money((a?.labor||0)+selectedParts.reduce((s,p)=>s+Number(p.price||0)*Number(p.qty||1),0))}</div>
 <button class="primary submit" type="submit">Kaydet</button></form>`);
 document.getElementById("appointmentForm").onsubmit=e=>{
   e.preventDefault();let f=new FormData(e.target), parts=readPicker();
   let obj={id:id||uid(),customerId:f.get("customerId"),date:f.get("date"),time:f.get("time"),jobType:f.get("jobType"),address:f.get("address"),labor:Number(f.get("labor")||0),note:f.get("note"),parts};
   if(id)data.appointments=data.appointments.map(x=>x.id===id?obj:x);else data.appointments.push(obj);
   save();closeModal();selectedDate=obj.date;currentDate=new Date(obj.date+"T00:00:00");renderCalendar();toast("Randevu kaydedildi.");
 };
}
function partPickerHtml(selected){
 return `<div>${data.parts.length?data.parts.map(p=>{let old=selected.find(x=>x.partId===p.id);return `<div class="part-row"><label><input type="checkbox" data-part="${p.id}" ${old?"checked":""}> ${esc(p.name)}<br><small>${money(p.price)}</small></label><input type="number" min="1" value="${old?.qty||1}" data-qty="${p.id}"><button type="button" onclick="this.parentElement.remove()">×</button></div>`}).join(""):`<span class="muted-text">Henüz parça yok. Önce “Parçalarım” bölümünden ekle.</span>`}</div>`;
}
function readPicker(){return [...document.querySelectorAll("#picker input[type=checkbox]:checked")].map(ch=>{let p=data.parts.find(x=>x.id===ch.dataset.part),q=Number(document.querySelector(`[data-qty="${ch.dataset.part}"]`)?.value||1);return {partId:p.id,name:p.name,price:Number(p.price),qty:q}})}
function editAppointment(id){appointmentForm(data.appointments.find(x=>x.id===id).date,id)}
function deleteAppointment(id){if(confirm("Bu randevu silinsin mi?")){data.appointments=data.appointments.filter(x=>x.id!==id);save();renderCalendar();toast("Randevu silindi.")}}

document.getElementById("addCustomerBtn").onclick=()=>customerForm();
function customerForm(id=null){
 const c=id?data.customers.find(x=>x.id===id):null;
 openModal(id?"Müşteriyi Düzenle":"Yeni Müşteri",`<form class="form" id="customerForm">
 <label>Ad Soyad<input name="name" required value="${esc(c?.name||"")}"></label>
 <label>Telefon<input name="phone" type="tel" value="${esc(c?.phone||"")}"></label>
 <label>Adres<input name="address" value="${esc(c?.address||"")}"></label>
 <label>Not<textarea name="note">${esc(c?.note||"")}</textarea></label>
 <button class="primary" type="submit">Kaydet</button></form>`);
 document.getElementById("customerForm").onsubmit=e=>{e.preventDefault();let f=new FormData(e.target),obj={id:id||uid(),name:f.get("name"),phone:f.get("phone"),address:f.get("address"),note:f.get("note")};if(id)data.customers=data.customers.map(x=>x.id===id?obj:x);else data.customers.push(obj);save();closeModal();renderCustomers();toast("Müşteri kaydedildi.")};
}
function renderCustomers(){
 let q=document.getElementById("customerSearch").value.toLowerCase();
 let arr=data.customers.filter(c=>`${c.name} ${c.phone} ${c.address}`.toLowerCase().includes(q));
 document.getElementById("customerList").innerHTML=arr.length?arr.map(c=>{let count=data.appointments.filter(a=>a.customerId===c.id).length;return `<div class="card"><h3>${esc(c.name)}</h3><p>${esc(c.phone||"Telefon yok")}</p><p>${esc(c.address||"Adres yok")}</p><p>${count} randevu</p><div class="actions"><button onclick="customerDetails('${c.id}')">Detay</button><button onclick="customerForm('${c.id}')">Düzenle</button><button onclick="deleteCustomer('${c.id}')">Sil</button></div></div>`}).join(""):`<div class="empty">Henüz müşteri yok.</div>`;
}
document.getElementById("customerSearch").oninput=renderCustomers;
function customerDetails(id){let c=data.customers.find(x=>x.id===id),aps=data.appointments.filter(a=>a.customerId===id).sort((a,b)=>b.date.localeCompare(a.date));openModal(c.name,`<p><b>Telefon:</b> ${esc(c.phone||"-")}<br><b>Adres:</b> ${esc(c.address||"-")}<br><b>Not:</b> ${esc(c.note||"-")}</p><h4>Geçmiş / Randevular</h4>${aps.length?aps.map(a=>`<div class="card"><b>${fmtDate(a.date)} ${esc(a.time||"")}</b><p>${esc(a.jobType||"")}</p><p>İşçilik: ${money(a.labor)} · Parçalar: ${money(a.parts.reduce((s,p)=>s+Number(p.price)*Number(p.qty),0))}</p></div>`).join(""):`<div class="empty">Randevu yok.</div>`)}
function deleteCustomer(id){if(confirm("Müşteri silinsin mi? Randevuları da silinir.")){data.customers=data.customers.filter(x=>x.id!==id);data.appointments=data.appointments.filter(x=>x.customerId!==id);save();renderCustomers();renderCalendar();toast("Müşteri silindi.")}}

document.getElementById("addPartBtn").onclick=()=>partForm();
function partForm(id=null){
 const p=id?data.parts.find(x=>x.id===id):null;
 openModal(id?"Parçayı Düzenle":"Yeni Parça",`<form class="form" id="partForm"><label>Parça Adı<input name="name" required value="${esc(p?.name||"")}" placeholder="Örn. NTC Sensör"></label><label>Fiyat (TL)<input name="price" type="number" step="0.01" min="0" required value="${p?.price??""}" placeholder="0"></label><button class="primary" type="submit">Kaydet</button></form>`);
 document.getElementById("partForm").onsubmit=e=>{e.preventDefault();let f=new FormData(e.target),obj={id:id||uid(),name:f.get("name"),price:Number(f.get("price")||0)};if(id)data.parts=data.parts.map(x=>x.id===id?obj:x);else data.parts.push(obj);save();closeModal();renderParts();toast("Parça kaydedildi.")};
}
function renderParts(){document.getElementById("partList").innerHTML=data.parts.length?data.parts.map(p=>`<div class="card"><h3>${esc(p.name)}</h3><p><b>${money(p.price)}</b></p><div class="actions"><button onclick="partForm('${p.id}')">Düzenle</button><button onclick="deletePart('${p.id}')">Sil</button></div></div>`).join(""):`<div class="empty">Henüz parça eklemedin.</div>`}
function deletePart(id){if(confirm("Bu parça silinsin mi? Eski randevulardaki kayıtlar korunur.")){data.parts=data.parts.filter(x=>x.id!==id);save();renderParts();toast("Parça silindi.")}}

function showPage(page){document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.id===page));document.querySelectorAll(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.page===page));if(page==="calendar")renderCalendar();if(page==="customers")renderCustomers();if(page==="parts")renderParts()}
document.querySelectorAll(".nav-item").forEach(x=>x.onclick=()=>showPage(x.dataset.page));

document.getElementById("exportBtn").onclick=()=>{let blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`kombi-ustasi-yedek-${isoDate(new Date())}.json`;a.click();URL.revokeObjectURL(a.href);toast("Yedek hazırlandı.")};
document.getElementById("importInput").onchange=e=>{let file=e.target.files[0];if(!file)return;let r=new FileReader();r.onload=()=>{try{let x=JSON.parse(r.result);if(!x.customers||!x.parts||!x.appointments)throw 0;data=x;save();renderCalendar();renderCustomers();renderParts();toast("Yedek geri yüklendi.")}catch{alert("Geçersiz yedek dosyası.")}};r.readAsText(file)};
document.getElementById("clearBtn").onclick=()=>{if(confirm("TÜM müşteri, randevu ve parça kayıtları silinecek. Emin misin?")){data={...emptyData};save();renderCalendar();renderCustomers();renderParts();toast("Tüm veriler silindi.")}};

if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
let deferredPrompt;window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;document.getElementById("installBtn").classList.remove("hidden")});
document.getElementById("installBtn").onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;document.getElementById("installBtn").classList.add("hidden")}};
renderCalendar();renderCustomers();renderParts();
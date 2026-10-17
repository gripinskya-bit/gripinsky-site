document.querySelectorAll("[data-plan]").forEach(b=>b.onclick=()=>{document.querySelector("#selected").textContent=b.dataset.plan;
document.querySelector("dialog").showModal()});
document.querySelector(".close").onclick=()=>document.querySelector("dialog").close();
document.querySelector("dialog").onclick=e=>{if(e.target===e.currentTarget)e.currentTarget.close()};

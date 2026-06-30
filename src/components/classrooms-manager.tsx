"use client";

import { useMemo, useState, useTransition } from "react";
import { deleteClassroomAction, saveClassroomAction } from "@/app/actions";

type Classroom = { id: number; building: string; floor: number; number: string; capacity: number };
type FormState = { id: number; building: string; floor: string; number: string; capacity: string };
const empty: FormState = { id: 0, building: "", floor: "", number: "", capacity: "" };
const PAGE_SIZE = 10;

export function ClassroomsManager({ classrooms }: { classrooms: Classroom[] }) {
  const [mode, setMode] = useState<"add" | "edit" | "delete" | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [buildingFilter, setBuildingFilter] = useState("");
  const [floorFilter, setFloorFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pending, startTransition] = useTransition();

  const buildings = useMemo(() => [...new Set(classrooms.map(x => x.building))].sort(), [classrooms]);
  const floors = useMemo(() => [...new Set(classrooms.map(x => x.floor))].sort((a,b)=>a-b), [classrooms]);
  const filtered = useMemo(() => classrooms.filter(x => {
    const term = search.trim().toLowerCase();
    return (!buildingFilter || x.building === buildingFilter)
      && (!floorFilter || String(x.floor) === floorFilter)
      && (!term || x.number.toLowerCase().includes(term) || x.building.toLowerCase().includes(term));
  }), [classrooms, buildingFilter, floorFilter, search]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const selected = classrooms.find(x => x.id === form.id);

  const openAdd = () => { setForm(empty); setMode("add"); };
  const openEdit = (x: Classroom) => {
    setForm({ id: x.id, building: x.building, floor: String(x.floor), number: x.number, capacity: String(x.capacity) });
    setMode("edit");
  };
  const save = () => startTransition(async () => {
    const fd = new FormData();
    if (form.id) fd.set("id", String(form.id));
    fd.set("building", form.building); fd.set("floor", form.floor); fd.set("number", form.number); fd.set("capacity", form.capacity);
    await saveClassroomAction(fd); setMode(null);
  });
  const remove = () => startTransition(async () => {
    const fd = new FormData(); fd.set("id", String(form.id));
    await deleteClassroomAction(fd); setMode(null);
  });
  const changeFilter = (setter: (value:string)=>void, value:string) => { setter(value); setPage(1); };

  return <div className="classrooms-page">
    <section className="table-card subject-card classroom-card">
      <div className="subject-heading">
        <div><h2>Edificios y salones registrados</h2></div>
        <button className="round-add" onClick={openAdd} aria-label="Agregar salón"><span className="bx bxs-plus-circle"></span></button>
      </div>
      <div className="filters-row classroom-filters">
        <div className="filter-group">
          <select value={buildingFilter} onChange={e=>changeFilter(setBuildingFilter,e.target.value)}><option value="">Edificio</option>{buildings.map(x=><option key={x} value={x}>{x}</option>)}</select>
          <select value={floorFilter} onChange={e=>changeFilter(setFloorFilter,e.target.value)}><option value="">Piso</option>{floors.map(x=><option key={x} value={x}>{x}</option>)}</select>
        </div>
        <label className="search-box"><span className="bx bxs-search"></span><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Buscar materia..." /></label>
      </div>
      <div className="table-scroll"><table><thead><tr>
        <th><span className="bx bxs-sort-alt"></span> Edificio</th><th><span className="bx bxs-sort-alt"></span> Piso</th><th><span className="bx bxs-sort-alt"></span> Salón</th><th><span className="bx bxs-sort-alt"></span> Cantidad</th><th>Acciones</th>
      </tr></thead><tbody>{visible.map(x=><tr key={x.id}><td>{x.building}</td><td>{x.floor}</td><td>{x.number}</td><td>{x.capacity}</td><td><div className="crud-actions"><button className="edit-btn" onClick={()=>openEdit(x)} aria-label="Editar salón"><span className="bx bxs-pencil"></span></button><button className="delete-btn" onClick={()=>{setForm({...empty,id:x.id});setMode("delete")}} aria-label="Eliminar salón"><span className="bx bxs-trash-alt"></span></button></div></td></tr>)}</tbody></table></div>
      <div className="pagination"><button disabled={safePage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}><span className="bx bxs-chevron-left"></span></button><button disabled={safePage>=pageCount} onClick={()=>setPage(p=>Math.min(pageCount,p+1))}><span className="bx bxs-chevron-right"></span></button></div>
    </section>

    {mode && <div className="modal-backdrop"><div className={`modal crud-modal classroom-modal ${mode==="delete"?"confirm-modal":""}`}>
      {mode === "delete" ? <><h2>Eliminar salón</h2><p>¿Estás seguro de eliminar el salón?</p><strong className="confirm-name">Salón: {selected?.number}</strong><div className="confirm-actions"><button className="danger-wide" disabled={pending} onClick={remove}>Eliminar salón</button><button onClick={()=>setMode(null)}>Cancelar</button></div></>
      : <><h2>{mode === "add" ? "Agregar salón" : "Editar salón"}</h2><div className="crud-form">
        <input placeholder="Edificio" value={form.building} onChange={e=>setForm({...form,building:e.target.value})}/>
        <input type="number" min="0" placeholder="Piso" value={form.floor} onChange={e=>setForm({...form,floor:e.target.value})}/>
        <input placeholder="Salón" value={form.number} onChange={e=>setForm({...form,number:e.target.value})}/>
        <input type="number" min="1" placeholder="Cantidad" value={form.capacity} onChange={e=>setForm({...form,capacity:e.target.value})}/>
      </div><div className="form-actions"><button className="cancel-red" onClick={()=>setMode(null)}>Cancelar</button><button className="accept-green" disabled={pending} onClick={save}>Aceptar</button></div></>}
    </div></div>}
  </div>;
}

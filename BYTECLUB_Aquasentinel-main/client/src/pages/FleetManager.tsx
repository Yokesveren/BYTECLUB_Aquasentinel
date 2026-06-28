import React, { useEffect, useState } from "react";
import { useVesselsStore, Vessel } from "../store/vesselsStore";
import { LeafletMap } from "../components/map/LeafletMap";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Plus, Edit2, Trash2, Search, ArrowUpDown, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

export const FleetManager: React.FC = () => {
  const {
    vessels,
    loading,
    pagination,
    filters,
    setFilters,
    fetchVessels,
    createVessel,
    updateVessel,
    deleteVessel
  } = useVesselsStore();

  // Selected Vessel for map sync
  const [selectedVesselId, setSelectedVesselId] = useState<string | null>(null);
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);

  // Search & Filter local states
  const [searchTerm, setSearchTerm] = useState(filters.search);

  // Modals state
  const [crudModalOpen, setCrudModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [vesselToDeleteId, setVesselToDeleteId] = useState<string>("");

  // Form Fields
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"FISHING" | "COMMUTE" | "SECURITY">("FISHING");
  const [formOwner, setFormOwner] = useState("");
  const [formHomePort, setFormHomePort] = useState("");
  const [formNodeId, setFormNodeId] = useState("");
  const [formLat, setFormLat] = useState("");
  const [formLng, setFormLng] = useState("");

  useEffect(() => {
    fetchVessels(1, 10);
  }, [filters]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ search: searchTerm });
  };

  const handleSort = (column: string) => {
    const isAsc = filters.sortBy === column && filters.sortOrder === "asc";
    setFilters({
      sortBy: column,
      sortOrder: isAsc ? "desc" : "asc"
    });
  };

  // Open Add Modal
  const openAddModal = () => {
    setEditMode(false);
    setFormId(`F-${Math.floor(100 + Math.random() * 900)}`); // Auto generate editable ID
    setFormName("");
    setFormType("FISHING");
    setFormOwner("");
    setFormHomePort("");
    setFormNodeId("SG-IND-01");
    setFormLat("13.08");
    setFormLng("80.27");
    setCrudModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (v: Vessel) => {
    setEditMode(true);
    setFormId(v.id);
    setFormName(v.name);
    setFormType(v.type);
    setFormOwner(v.owner_name || "");
    setFormHomePort(v.home_port || "");
    setFormNodeId(v.assigned_node_id || "");
    setFormLat(String(v.lat));
    setFormLng(String(v.lng));
    setCrudModalOpen(true);
  };

  // Submit CRUD Form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formId || !formName || !formType || !formLat || !formLng) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const payload = {
      id: formId,
      name: formName,
      type: formType,
      owner_name: formOwner,
      home_port: formHomePort,
      assigned_node_id: formNodeId,
      lat: Number(formLat),
      lng: Number(formLng)
    };

    try {
      if (editMode) {
        await updateVessel(formId, payload);
        toast.success(`Vessel ${formId} updated.`);
      } else {
        await createVessel(payload);
        toast.success(`Vessel ${formId} created.`);
      }
      setCrudModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Submit failed.");
    }
  };

  // Delete Confirm
  const openDeleteConfirm = (id: string) => {
    setVesselToDeleteId(id);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    try {
      await deleteVessel(vesselToDeleteId);
      toast.success(`Vessel ${vesselToDeleteId} deleted.`);
      setDeleteConfirmOpen(false);
    } catch {
      toast.error("Delete failed.");
    }
  };

  // Map Row Sync click handlers
  const handleRowClick = (v: Vessel) => {
    setSelectedVesselId(v.id);
  };

  const handleVesselSelectedFromMap = (vesselId: string) => {
    setHighlightedRowId(vesselId);
    // Remove glow after 2 seconds
    setTimeout(() => {
      setHighlightedRowId(null);
    }, 2000);

    // Scroll corresponding table row into view
    const rowEl = document.getElementById(`vessel-row-${vesselId}`);
    if (rowEl) {
      rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const getStatusIndicator = (status: string) => {
    const color = {
      online: "bg-accent-teal pulse-teal-dot",
      alert: "bg-accent-red pulse-red-dot",
      degraded: "bg-accent-amber pulse-amber-dot",
      offline: "bg-text-muted"
    }[status] || "bg-text-muted";
    return <span className={`h-2 w-2 rounded-full inline-block mr-1.5 ${color}`} />;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] overflow-hidden space-y-4 font-sans">
      
      {/* TOP 60%: Live Ship Radar Map */}
      <div className="h-3/5 border border-border-color rounded-xl overflow-hidden relative">
        <LeafletMap
          mode="radar"
          selectedVesselId={selectedVesselId}
          onVesselSelect={handleVesselSelectedFromMap}
        />
      </div>

      {/* BOTTOM 40%: Table Section */}
      <div className="h-2/5 panel-glass p-4 flex flex-col justify-between overflow-hidden">
        
        {/* Table Filters & Search Bar */}
        <div className="flex justify-between items-center mb-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2 w-1/3">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search Vessel ID or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-4 py-1.5 bg-bg-card/50 border border-border-color rounded-lg font-mono text-xs text-text-primary focus:outline-none focus:border-accent-teal"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-secondary" />
            </div>
            <Button variant="outline" size="sm" type="submit">
              GO
            </Button>
          </form>

          <div className="flex gap-3 items-center">
            {/* Type filters */}
            <select
              value={filters.type}
              onChange={(e) => setFilters({ type: e.target.value })}
              className="bg-bg-card/80 border border-border-color text-text-primary font-mono text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-accent-teal"
            >
              <option value="All">All Types</option>
              <option value="FISHING">Fishing</option>
              <option value="COMMUTE">Commute</option>
              <option value="SECURITY">Security</option>
            </select>

            {/* Status filters */}
            <select
              value={filters.status}
              onChange={(e) => setFilters({ status: e.target.value })}
              className="bg-bg-card/80 border border-border-color text-text-primary font-mono text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-accent-teal"
            >
              <option value="All">All Status</option>
              <option value="online">Online</option>
              <option value="alert">Alert</option>
              <option value="degraded">Degraded</option>
              <option value="offline">Offline</option>
            </select>

            <Button variant="primary" size="sm" onClick={openAddModal} className="flex items-center gap-1">
              <Plus className="h-4 w-4" /> ADD VESSEL
            </Button>
          </div>
        </div>

        {/* Scrollable Table View */}
        <div className="flex-1 overflow-y-auto border border-border-color/30 rounded-lg">
          <table className="w-full text-left font-mono text-[11px] text-text-primary border-collapse">
            <thead className="bg-bg-deep/80 text-text-secondary sticky top-0 uppercase border-b border-border-color">
              <tr>
                <th className="p-2.5 cursor-pointer hover:text-accent-teal" onClick={() => handleSort("id")}>
                  Vessel ID <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </th>
                <th className="p-2.5 cursor-pointer hover:text-accent-teal" onClick={() => handleSort("name")}>
                  Name <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </th>
                <th className="p-2.5 cursor-pointer hover:text-accent-teal" onClick={() => handleSort("type")}>
                  Type <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </th>
                <th className="p-2.5">Assigned Node</th>
                <th className="p-2.5">Owner</th>
                <th className="p-2.5">Position</th>
                <th className="p-2.5 cursor-pointer hover:text-accent-teal" onClick={() => handleSort("status")}>
                  Status <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </th>
                <th className="p-2.5 cursor-pointer hover:text-accent-teal" onClick={() => handleSort("speed")}>
                  Speed <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </th>
                <th className="p-2.5 cursor-pointer hover:text-accent-teal" onClick={() => handleSort("battery_pct")}>
                  Battery <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </th>
                <th className="p-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color/30">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-4 text-center text-text-secondary">Loading fleet data...</td>
                </tr>
              ) : vessels.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-4 text-center text-text-muted italic">No vessels match search query.</td>
                </tr>
              ) : (
                vessels.map((v: Vessel) => (
                  <tr
                    key={v.id}
                    id={`vessel-row-${v.id}`}
                    onClick={() => handleRowClick(v)}
                    className={`hover:bg-border-strong/20 cursor-pointer transition-all duration-150 ${
                      highlightedRowId === v.id
                        ? "bg-accent-teal/10 border-y border-accent-teal"
                        : ""
                    }`}
                  >
                    <td className="p-2.5 font-bold text-accent-blue">{v.id}</td>
                    <td className="p-2.5 font-bold">{v.name}</td>
                    <td className="p-2.5">{v.type}</td>
                    <td className="p-2.5">{v.assigned_node_id || "None"}</td>
                    <td className="p-2.5 font-sans">{v.owner_name || "-"}</td>
                    <td className="p-2.5">{v.lat.toFixed(3)}, {v.lng.toFixed(3)}</td>
                    <td className="p-2.5 flex items-center">{getStatusIndicator(v.status)}{v.status}</td>
                    <td className="p-2.5">{v.speed.toFixed(1)} kn</td>
                    <td className="p-2.5">{v.battery_pct}%</td>
                    <td className="p-2.5 text-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openEditModal(v)} className="text-accent-teal hover:text-accent-teal/70 p-1">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => openDeleteConfirm(v.id)} className="text-accent-red hover:text-accent-red/70 p-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex justify-between items-center mt-2.5 font-mono text-[10px] text-text-secondary">
          <span>
            Total: <span className="font-bold text-text-primary">{pagination.total}</span> vessels
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchVessels(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1 rounded bg-bg-card hover:bg-border-color border border-border-color/40 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>PAGE {pagination.page} OF {pagination.pages || 1}</span>
            <button
              onClick={() => fetchVessels(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="p-1 rounded bg-bg-card hover:bg-border-color border border-border-color/40 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Vessel Modal */}
      <Modal isOpen={crudModalOpen} onClose={() => setCrudModalOpen(false)} title={editMode ? "EDIT VESSEL TELEMETRY" : "REGISTER NEW MESH VESSEL"}>
        <form onSubmit={handleFormSubmit} className="space-y-4 font-mono text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-text-secondary mb-1">Vessel ID *</label>
              <input
                type="text"
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
                disabled={editMode}
                className="w-full px-3 py-2 bg-bg-card border border-border-color rounded-lg text-text-primary focus:outline-none focus:border-accent-teal disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-text-secondary mb-1">Name *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-2 bg-bg-card border border-border-color rounded-lg text-text-primary focus:outline-none focus:border-accent-teal"
              />
            </div>
            <div>
              <label className="block text-text-secondary mb-1">Type *</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as any)}
                className="w-full px-3 py-2 bg-bg-card border border-border-color rounded-lg text-text-primary focus:outline-none focus:border-accent-teal"
              >
                <option value="FISHING">FISHING</option>
                <option value="COMMUTE">COMMUTE</option>
                <option value="SECURITY">SECURITY</option>
              </select>
            </div>
            <div>
              <label className="block text-text-secondary mb-1">Owner Name</label>
              <input
                type="text"
                value={formOwner}
                onChange={(e) => setFormOwner(e.target.value)}
                className="w-full px-3 py-2 bg-bg-card border border-border-color rounded-lg text-text-primary focus:outline-none focus:border-accent-teal"
              />
            </div>
            <div>
              <label className="block text-text-secondary mb-1">Home Port</label>
              <input
                type="text"
                value={formHomePort}
                onChange={(e) => setFormHomePort(e.target.value)}
                className="w-full px-3 py-2 bg-bg-card border border-border-color rounded-lg text-text-primary focus:outline-none focus:border-accent-teal"
              />
            </div>
            <div>
              <label className="block text-text-secondary mb-1">Assigned Node ID</label>
              <input
                type="text"
                value={formNodeId}
                onChange={(e) => setFormNodeId(e.target.value)}
                className="w-full px-3 py-2 bg-bg-card border border-border-color rounded-lg text-text-primary focus:outline-none focus:border-accent-teal"
              />
            </div>
            <div>
              <label className="block text-text-secondary mb-1">Initial GPS Latitude *</label>
              <input
                type="text"
                value={formLat}
                onChange={(e) => setFormLat(e.target.value)}
                className="w-full px-3 py-2 bg-bg-card border border-border-color rounded-lg text-text-primary focus:outline-none focus:border-accent-teal"
              />
            </div>
            <div>
              <label className="block text-text-secondary mb-1">Initial GPS Longitude *</label>
              <input
                type="text"
                value={formLng}
                onChange={(e) => setFormLng(e.target.value)}
                className="w-full px-3 py-2 bg-bg-card border border-border-color rounded-lg text-text-primary focus:outline-none focus:border-accent-teal"
              />
            </div>
          </div>
          <div className="border-t border-border-color pt-4 flex gap-3 justify-end">
            <Button variant="outline" size="sm" type="button" onClick={() => setCrudModalOpen(false)}>
              CANCEL
            </Button>
            <Button variant="primary" size="sm" type="submit">
              SAVE CHANGES
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Modal isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="CONFIRM DELETION">
        <div className="font-mono text-xs space-y-4">
          <p className="text-text-primary flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-accent-red" />
            Are you sure you want to remove vessel <span className="text-accent-red font-bold">{vesselToDeleteId}</span>?
          </p>
          <p className="text-text-secondary">This action will delete all position history and historical signals in the database. This cannot be undone.</p>
          <div className="border-t border-border-color pt-4 flex gap-3 justify-end">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmOpen(false)}>
              CANCEL
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              DELETE VESSEL
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default FleetManager;

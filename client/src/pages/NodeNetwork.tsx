import React, { useEffect, useState } from "react";
import { useNodesStore, RelayNode } from "../store/nodesStore";
import { NetworkTopology } from "../components/ui/NetworkTopology";
import { Node3DInspectorModal } from "../components/ui/Node3DInspectorModal";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { Plus, Edit2, Trash2, Radio, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

export const NodeNetwork: React.FC = () => {
  const { nodes, loading, fetchNodes, createNode, updateNode, deleteNode } = useNodesStore();

  // Filters
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  // Selection states for inspector
  const [inspectorNode, setInspectorNode] = useState<RelayNode | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  // CRUD Form states
  const [crudModalOpen, setCrudModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [nodeToDeleteId, setNodeToDeleteId] = useState("");

  // Form Fields
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"shore" | "buoy" | "vessel">("shore");
  const [formLocation, setFormLocation] = useState("");
  const [formLat, setFormLat] = useState("");
  const [formLng, setFormLng] = useState("");
  const [formUptime, setFormUptime] = useState("100.0");

  useEffect(() => {
    fetchNodes();
  }, []);

  const handleNodeInspect = (node: RelayNode) => {
    setInspectorNode(node);
    setInspectorOpen(true);
  };

  // Open Add modal
  const openAddModal = () => {
    setEditMode(false);
    setFormId(`SG-IND-0${nodes.length + 1}`);
    setFormName("");
    setFormType("shore");
    setFormLocation("");
    setFormLat("10.0");
    setFormLng("80.0");
    setFormUptime("100.0");
    setCrudModalOpen(true);
  };

  // Open Edit modal
  const openEditModal = (node: RelayNode) => {
    setEditMode(true);
    setFormId(node.id);
    setFormName(node.name);
    setFormType(node.type);
    setFormLocation(node.location_name);
    setFormLat(String(node.lat));
    setFormLng(String(node.lng));
    setFormUptime(String(node.uptime_pct));
    setCrudModalOpen(true);
  };

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
      location_name: formLocation,
      lat: Number(formLat),
      lng: Number(formLng),
      uptime_pct: Number(formUptime)
    };

    try {
      if (editMode) {
        await updateNode(formId, payload);
        toast.success(`Node ${formId} updated.`);
      } else {
        await createNode(payload);
        toast.success(`Node ${formId} created.`);
      }
      setCrudModalOpen(false);
    } catch {
      toast.error("Submit failed.");
    }
  };

  const openDeleteConfirm = (id: string) => {
    setNodeToDeleteId(id);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    try {
      await deleteNode(nodeToDeleteId);
      toast.success(`Node ${nodeToDeleteId} deleted.`);
      setDeleteConfirmOpen(false);
    } catch {
      toast.error("Delete failed.");
    }
  };

  const filteredNodes = nodes.filter((n) => {
    const typeMatch = filterType === "All" || n.type === filterType;
    const statusMatch = filterStatus === "All" || n.status === filterStatus;
    return typeMatch && statusMatch;
  });

  const getStatusBadge = (status: string) => {
    const map = {
      online: "teal",
      degraded: "amber",
      offline: "gray"
    } as const;
    return <Badge variant={map[status as keyof typeof map]}>{status}</Badge>;
  };

  const handleInspectFromMap = (nodeId: string) => {
    // Locate node in store and open map
    toast.success(`Locating node ${nodeId} on live map...`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] overflow-hidden space-y-4 font-sans">
      
      {/* TOP HALF: Network topology diagram */}
      <div className="h-1/2 border border-border-color rounded-xl overflow-hidden relative flex">
        <div className="flex-1 h-full bg-gradient-to-b from-bg-deep to-[#0c1828]">
          <NetworkTopology nodes={nodes} onNodeClick={handleNodeInspect} />
        </div>
        
        {/* Legend Sidebar overlay */}
        <div className="w-56 border-l border-border-color bg-bg-panel/50 p-4 font-mono text-[10px] space-y-3 z-10 backdrop-blur-sm">
          <div className="text-text-secondary uppercase tracking-widest font-display font-bold border-b border-border-color pb-1.5 mb-2">
            Network Legend
          </div>
          <div className="space-y-2 text-text-primary">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-accent-blue inline-block" />
              <span>Shore Gateway (Primary)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 bg-accent-teal inline-block" />
              <span>Buoy Relay (Buoyancy)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent-amber inline-block" />
              <span>Vessel Link Node</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent-red pulse-red-dot inline-block" />
              <span>Distress Alerting Node</span>
            </div>
            <div className="border-t border-border-color/30 pt-2 text-text-secondary text-[9px] leading-relaxed">
              * Edges denote Lora Mesh links under 350km range. Data packets animate dynamically.
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM HALF: Node list table */}
      <div className="h-1/2 panel-glass p-4 flex flex-col justify-between overflow-hidden">
        
        {/* Table Filters & Actions */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex gap-2">
            <h3 className="font-display font-bold text-text-primary text-sm tracking-wider uppercase flex items-center gap-2">
              <Radio className="h-4.5 w-4.5 text-accent-blue" />
              Active Mesh Relay Gateways
            </h3>
          </div>

          <div className="flex gap-3 items-center">
            {/* Filter by type */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-bg-card border border-border-color text-text-primary font-mono text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-accent-teal"
            >
              <option value="All">All Types</option>
              <option value="shore">Shore Gateway</option>
              <option value="buoy">Buoy Relay</option>
              <option value="vessel">Vessel Node</option>
            </select>

            {/* Filter by status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-bg-card border border-border-color text-text-primary font-mono text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-accent-teal"
            >
              <option value="All">All Statuses</option>
              <option value="online">Online</option>
              <option value="degraded">Degraded</option>
              <option value="offline">Offline</option>
            </select>

            <Button variant="primary" size="sm" onClick={openAddModal} className="flex items-center gap-1">
              <Plus className="h-4 w-4" /> ADD NODE
            </Button>
          </div>
        </div>

        {/* Scrollable Node Table */}
        <div className="flex-1 overflow-y-auto border border-border-color/30 rounded-lg">
          <table className="w-full text-left font-mono text-[11px] text-text-primary border-collapse">
            <thead className="bg-bg-deep/80 text-text-secondary sticky top-0 uppercase border-b border-border-color">
              <tr>
                <th className="p-2.5">Node ID</th>
                <th className="p-2.5">Name</th>
                <th className="p-2.5">Type</th>
                <th className="p-2.5">Location</th>
                <th className="p-2.5">GPS Coords</th>
                <th className="p-2.5">Signal</th>
                <th className="p-2.5">Uptime</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color/30">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-4 text-center text-text-secondary">Loading node network data...</td>
                </tr>
              ) : filteredNodes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-4 text-center text-text-muted italic">No nodes matching filter.</td>
                </tr>
              ) : (
                filteredNodes.map((n: RelayNode) => (
                  <tr
                    key={n.id}
                    onClick={() => handleNodeInspect(n)}
                    className="hover:bg-border-strong/20 cursor-pointer transition-all duration-150"
                  >
                    <td className="p-2.5 font-bold text-accent-teal">{n.id}</td>
                    <td className="p-2.5 font-bold">{n.name}</td>
                    <td className="p-2.5 uppercase">{n.type}</td>
                    <td className="p-2.5 font-sans">{n.location_name || "-"}</td>
                    <td className="p-2.5">{n.lat.toFixed(3)}, {n.lng.toFixed(3)}</td>
                    <td className="p-2.5">{n.signal_strength}/5</td>
                    <td className="p-2.5 text-accent-teal">{n.uptime_pct}%</td>
                    <td className="p-2.5">{getStatusBadge(n.status)}</td>
                    <td className="p-2.5 text-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openEditModal(n)} className="text-accent-teal hover:text-accent-teal/70 p-1">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => openDeleteConfirm(n.id)} className="text-accent-red hover:text-accent-red/70 p-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3D Inspector Modal */}
      <Node3DInspectorModal
        isOpen={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        node={inspectorNode}
        onViewOnMap={handleInspectFromMap}
      />

      {/* Add / Edit Node Modal */}
      <Modal isOpen={crudModalOpen} onClose={() => setCrudModalOpen(false)} title={editMode ? "EDIT NODE SETTINGS" : "PROVISION NEW GATEWAY NODE"}>
        <form onSubmit={handleFormSubmit} className="space-y-4 font-mono text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-text-secondary mb-1">Node ID *</label>
              <input
                type="text"
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
                disabled={editMode}
                className="w-full px-3 py-2 bg-bg-card border border-border-color rounded-lg text-text-primary focus:outline-none focus:border-accent-teal disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-text-secondary mb-1">Node Name *</label>
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
                <option value="shore">Shore Gateway</option>
                <option value="buoy">Buoy Relay</option>
                <option value="vessel">Vessel Node</option>
              </select>
            </div>
            <div>
              <label className="block text-text-secondary mb-1">Location Name</label>
              <input
                type="text"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                className="w-full px-3 py-2 bg-bg-card border border-border-color rounded-lg text-text-primary focus:outline-none focus:border-accent-teal"
              />
            </div>
            <div>
              <label className="block text-text-secondary mb-1">Latitude Coordinate *</label>
              <input
                type="text"
                value={formLat}
                onChange={(e) => setFormLat(e.target.value)}
                className="w-full px-3 py-2 bg-bg-card border border-border-color rounded-lg text-text-primary focus:outline-none focus:border-accent-teal"
              />
            </div>
            <div>
              <label className="block text-text-secondary mb-1">Longitude Coordinate *</label>
              <input
                type="text"
                value={formLng}
                onChange={(e) => setFormLng(e.target.value)}
                className="w-full px-3 py-2 bg-bg-card border border-border-color rounded-lg text-text-primary focus:outline-none focus:border-accent-teal"
              />
            </div>
            <div>
              <label className="block text-text-secondary mb-1">Uptime Metric (%)</label>
              <input
                type="text"
                value={formUptime}
                onChange={(e) => setFormUptime(e.target.value)}
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

      {/* Delete Confirm Modal */}
      <Modal isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="DELETE NODE CONFIRMATION">
        <div className="font-mono text-xs space-y-4">
          <p className="text-text-primary flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-accent-red" />
            Are you sure you want to remove node <span className="text-accent-red font-bold">{nodeToDeleteId}</span>?
          </p>
          <p className="text-text-secondary">This node will be removed from the LoRa mesh network topology, breaking neighbors routes. This cannot be undone.</p>
          <div className="border-t border-border-color pt-4 flex gap-3 justify-end">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmOpen(false)}>
              CANCEL
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              CONFIRM DELETE
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default NodeNetwork;

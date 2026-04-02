import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  AlertCircle,
  Loader2,
  Info,
  Eye,
  Filter,
  X,
  LibraryBig,
  LibraryBigIcon,
  LayoutGrid,
  List,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Release, Track } from "../types";
import ReleasePreviewDialog from "../components/ReleasePreviewDialog";
import RevenueSplitModal from "../components/RevenueSplitModal";
import { PieChart } from "lucide-react";
import { toast } from "sonner";
const STATUS_OPTIONS = [
  "DRAFT",
  "CHECKING",
  "PROCESSING",
  "ACCEPTED",
  "REJECTED",
  "TAKENDOWN",
  "ERROR",
];
const Discography: React.FC = () => {
  const navigate = useNavigate();
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | "ALL">(8);

  // Preview State
  const [previewRelease, setPreviewRelease] = useState<Release | null>(null);
  const [previewTracks, setPreviewTracks] = useState<Track[]>([]);

  // Delete/Takedown Modal State
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    release: Release | null;
    type: "TAKEDOWN" | "DELETE" | null;
  }>({ show: false, release: null, type: null });
  const [splitModal, setSplitModal] = useState<{
    show: boolean;
    id: number;
    title: string;
  }>({ show: false, id: 0, title: "" });
  const [actionLoading, setActionLoading] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [queueInput, setQueueInput] = useState("");
  const [importQueue, setImportQueue] = useState<QueueItem[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  type QueueItem = {
    id: string; // random local id
    url: string;
    status: 'idle' | 'fetching_meta' | 'ready' | 'importing' | 'done' | 'error';
    data?: any;
    errorMsg?: string;
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatuses, itemsPerPage]);

  const handleAddToQueue = async () => {
    if (!queueInput.trim()) return;
    
    const newItem: QueueItem = {
      id: Math.random().toString(36).substring(7),
      url: queueInput.trim(),
      status: 'fetching_meta'
    };
    
    setImportQueue(prev => [...prev, newItem]);
    setQueueInput("");

    // Immediately fetch preview data from Microlink for visual feedback
    try {
      const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(newItem.url)}`);
      const json = await res.json();
      if (json.status === "success") {
        setImportQueue(prev => prev.map(item => 
          item.id === newItem.id 
            ? { ...item, status: 'ready', data: json.data } 
            : item
        ));
      } else {
        throw new Error("Invalid URL");
      }
    } catch (err: any) {
      setImportQueue(prev => prev.map(item => 
        item.id === newItem.id ? { ...item, status: 'error', errorMsg: "Failed to fetch preview" } : item
      ));
    }
  };

  const handleProcessQueue = async () => {
    setIsProcessingQueue(true);
    
    // Create a copy of the queue to iterate over
    const itemsToProcess = importQueue.filter(item => item.status === 'ready');
    
    for (const item of itemsToProcess) {
      // Mark as currently importing (which triggers the upscaler)
      setImportQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'importing' } : q));
      
      try {
        await api.catalog.importFromMicrolink(item.url);
        
        // Mark as done
        setImportQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'done' } : q));
        
        // Optional: Refresh the background grid so the user sees the new release appear behind the modal
        loadData(); 
      } catch (err: any) {
        setImportQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error', errorMsg: err.message } : q));
      }
    }
    
    setIsProcessingQueue(false);
    toast.success("Queue processing complete!");
  };

  const handleRemoveFromQueue = (id: string) => {
    setImportQueue(prev => prev.filter(item => item.id !== id));
  };
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.catalog.getReleases();
      setReleases(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  const handleCreateDraft = async () => {
    setCreating(true);
    try {
      const newRelease = await api.catalog.createDraft();
      // Chuyển hướng ngay sang trang Edit với ID mới
      navigate(`/discography/edit/${newRelease.id}`);
    } catch (err: any) {
      toast.error("Failed to initialize release: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handlePreview = async (release: Release) => {
    setPreviewRelease(release);
    setPreviewTracks([]); // Clear previous state
    try {
      // 2. Fetch tracks from Supabase
      const tracks = await api.tracks.getByReleaseId(release.id);
      setPreviewTracks(tracks);
    } catch (error) {
      console.error("Failed to load tracks for preview", error);
      toast.error(`Failed to load tracks for preview.${error}`);
      // Optional: Add a visual indicator or toast.error if fetch fails
    }
  };

  const handleActionClick = (release: Release) => {
    const isAccepted = release.status === "ACCEPTED";
    setConfirmModal({
      show: true,
      release,
      type: isAccepted ? "TAKEDOWN" : "DELETE",
    });
  };

  const executeAction = async () => {
    if (!confirmModal.release || !confirmModal.type) return;

    setActionLoading(true);
    try {
      if (confirmModal.type === "TAKEDOWN") {
        await api.catalog.requestTakedown(confirmModal.release.id);
        setReleases((prev) =>
          prev.map((r) =>
            r.id === confirmModal.release?.id
              ? { ...r, status: "PROCESSING" }
              : r,
          ),
        );
      } else {
        await api.catalog.deleteRelease(confirmModal.release.id);
        setReleases((prev) =>
          prev.filter((r) => r.id !== confirmModal.release?.id),
        );
      }
      setConfirmModal({ show: false, release: null, type: null });
    } catch (err) {
      toast.error("Failed to process request.");
    } finally {
      setActionLoading(false);
    }
  };
  const toggleStatusFilter = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    );
  };

  const clearFilters = () => setSelectedStatuses([]);

  const filteredReleases = releases.filter((r) => {
    const matchesSearch =
      r.title?.toLowerCase().includes(searchQuery?.toLowerCase()) ||
      r.artist?.toLowerCase().includes(searchQuery?.toLowerCase()) ||
      (r.upc && r.upc.includes(searchQuery));
    const matchesStatus =
      selectedStatuses.length === 0 || selectedStatuses.includes(r.status);
    return matchesSearch && matchesStatus;
  });

  const totalPages = itemsPerPage === "ALL" ? 1 : Math.ceil(filteredReleases.length / itemsPerPage);
  const paginatedReleases = itemsPerPage === "ALL" 
    ? filteredReleases 
    : filteredReleases.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="-m-6 lg:-m-8 flex flex-col h-[calc(100vh-64px)] relative font-sans">
      <div className="flex-1 overflow-y-auto px-6 lg:px-8 pt-6 lg:pt-8 pb-12 space-y-6 w-full">
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white flex items-center gap-2">
            Discography
          </h1>
          <p className="text-gray-400 font-mono text-sm">
            Manage your releases and distribution status.
          </p>
        </div>
        <style
          dangerouslySetInnerHTML={{
            __html:
              ".flex.justify-between.items-end > div:first-child { flex-grow: 1; }",
          }}
        />
        <React.Fragment>
          <button
            onClick={() => setShowImporter(true)}
            className="px-6 py-2 bg-transparent border border-white/20 text-white font-bold uppercase hover:bg-white/10 transition flex items-center gap-2 text-sm"
          >
            <LibraryBigIcon size={16} />
            Import Release
          </button>
          
          {showImporter && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-surface border border-white/10 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/40 shrink-0">
                        <div>
                            <h3 className="font-bold uppercase text-lg">Release Importer</h3>
                            <p className="text-xs text-gray-400 font-mono mt-1">Paste links to fetch metadata and import directly</p>
                        </div>
                        <button onClick={() => setShowImporter(false)} className="text-gray-500 hover:text-white transition" disabled={isProcessingQueue}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 shrink-0 border-b border-white/5">
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={queueInput}
                                onChange={(e) => setQueueInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddToQueue()}
                                placeholder="Paste Spotify or Apple Music Link..."
                                className="flex-1 bg-black/50 border border-white/10 rounded-lg py-2 px-4 text-sm focus:outline-none focus:border-blue-500 transition"
                                disabled={isProcessingQueue}
                            />
                            <button 
                                onClick={handleAddToQueue}
                                disabled={!queueInput.trim() || isProcessingQueue}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold uppercase rounded text-xs transition disabled:opacity-50"
                            >
                                Add
                            </button>
                        </div>
                    </div>

                    <div className="p-6 overflow-y-auto flex-1 bg-black/20 space-y-3 min-h-[300px]">
                        {importQueue.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 font-mono text-sm opacity-50">
                                <LibraryBigIcon size={48} className="mb-4 opacity-50" />
                                Queue is empty. Paste a link above.
                            </div>
                        ) : (
                            importQueue.map((item) => (
                                <div key={item.id} className="flex items-center gap-4 bg-surface border border-white/10 p-3 rounded-lg relative overflow-hidden">
                                    {/* Loading State Overlay */}
                                    {item.status === 'importing' && (
                                        <div className="absolute inset-0 bg-blue-900/20 backdrop-blur-[2px] flex items-center justify-center z-10 border border-blue-500/50 rounded-lg">
                                            <span className="text-blue-400 font-bold text-xs uppercase flex items-center gap-2 shadow-black drop-shadow-md">
                                                <Loader2 size={14} className="animate-spin" /> Upscaling & Importing...
                                            </span>
                                        </div>
                                    )}
                                    {item.status === 'done' && (
                                        <div className="absolute inset-0 bg-green-900/20 backdrop-blur-[1px] flex items-center justify-center z-10 border border-green-500/50 rounded-lg">
                                            <span className="text-green-400 font-bold text-xs uppercase drop-shadow-md">SUCCESS</span>
                                        </div>
                                    )}

                                    {/* Thumbnail */}
                                    <div className="w-12 h-12 bg-black rounded shrink-0 flex items-center justify-center border border-white/10 overflow-hidden">
                                        {item.status === 'fetching_meta' ? <Loader2 size={14} className="animate-spin text-gray-500" /> : 
                                         item.data?.image?.url ? <img src={item.data.image.url} alt="cover" className="w-full h-full object-cover" /> : 
                                         <span className="text-[10px] text-gray-600 font-mono">N/A</span>}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        {item.status === 'fetching_meta' ? (
                                            <div className="h-4 bg-white/5 rounded w-1/2 animate-pulse"></div>
                                        ) : item.status === 'error' ? (
                                            <p className="text-red-400 text-xs font-mono truncate">{item.errorMsg}</p>
                                        ) : (
                                            <>
                                                <p className="font-bold text-sm truncate">{item.data?.title || "Unknown Title"}</p>
                                                <p className="text-xs text-gray-400 truncate font-mono">{item.data?.author || "Unknown Artist"}</p>
                                            </>
                                        )}
                                    </div>

                                    {/* Remove Action */}
                                    {item.status !== 'importing' && item.status !== 'done' && (
                                        <button onClick={() => handleRemoveFromQueue(item.id)} className="p-2 text-gray-500 hover:text-red-400 transition shrink-0">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 border-t border-white/10 bg-black/40 flex justify-end gap-3 shrink-0">
                        <button 
                            onClick={() => setShowImporter(false)} 
                            disabled={isProcessingQueue}
                            className="px-4 py-2 border border-white/10 text-white font-bold uppercase rounded text-xs hover:bg-white/5 transition disabled:opacity-50"
                        >
                            Close
                        </button>
                        <button 
                            onClick={handleProcessQueue}
                            disabled={isProcessingQueue || importQueue.filter(q => q.status === 'ready').length === 0}
                            className="px-6 py-2 bg-blue-600 text-white font-bold uppercase rounded text-xs hover:bg-blue-500 transition flex items-center gap-2 disabled:opacity-50"
                        >
                            {isProcessingQueue ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            {isProcessingQueue ? "Processing..." : `Process Queue (${importQueue.filter(q => q.status === 'ready').length})`}
                        </button>
                    </div>
                </div>
            </div>
          )}
        </React.Fragment>
        <button style={{ display: "none" }}></button>
        <button
          onClick={handleCreateDraft}
          disabled={creating}
          className="px-6 py-2 bg-blue-600 text-white font-bold uppercase hover:bg-blue-500 transition shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center gap-2 text-sm disabled:opacity-50"
        >
          {creating ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Plus size={16} />
          )}
          New Release
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            size={16}
          />
          <input
            type="text"
            placeholder="SEARCH ARCHIVES..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 transition font-mono placeholder-gray-700"
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-mono text-gray-500 uppercase flex items-center gap-1 mr-2">
            <Filter size={12} /> Filter:
          </span>
        {STATUS_OPTIONS.map((status) => {
          const isActive = selectedStatuses.includes(status);
          return (
            <button
              key={status}
              onClick={() => toggleStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition border ${isActive
                ? "bg-blue-600 text-white border-blue-500"
                : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white"
                }`}
            >
              {status}
            </button>
          );
        })}
        {selectedStatuses.length > 0 && (
          <button
            onClick={clearFilters}
            className="ml-auto text-[10px] text-red-400 hover:text-red-300 font-bold uppercase flex items-center gap-1"
          >
            <X size={12} /> Clear Filters
          </button>
        )}
        </div>
        <div className="flex bg-black/50 p-1 rounded-lg border border-white/10 shrink-0">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-md transition ${viewMode === "grid" ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-white"}`}
            title="Grid View"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-md transition ${viewMode === "list" ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-white"}`}
            title="List View"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-blue-500" size={40} />
          <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">
            Accessing Vault...
          </p>
        </div>
      ) : filteredReleases.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-500 text-sm font-mono">
          There&apos;s no release yet :/
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginatedReleases.map((release) => (
            <div
              key={release.id}
              className="group bg-surface border border-white/10 hover:border-blue-500/50 rounded-xl overflow-hidden transition-all duration-300"
            >
              <div className="aspect-square relative overflow-hidden bg-black">
                {release.coverArt ? (
                  <img
                    src={release.coverArt}
                    alt={release.title}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-700 font-mono text-xs border border-white/5 m-4 rounded">
                    NO_SIGNAL
                  </div>
                )}

                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Preview Button - Always Visible */}
                  <button
                    onClick={() => handlePreview(release)}
                    className="p-1.5 bg-black/80 text-white hover:text-blue-400 rounded backdrop-blur-sm border border-white/10"
                    title="Preview Release"
                  >
                    <Eye size={14} />
                  </button>
                  {/* Edit Button - Hide if Checking or Processing */}
                  {release.status !== "CHECKING" && release.status !== "PROCESSING" && (
                    <Link
                      to={`/discography/edit/${release.id}`}
                      className="p-1.5 bg-black/80 text-white hover:text-green-400 rounded backdrop-blur-sm border border-white/10"
                    >
                      <Edit2 size={14} />
                    </Link>
                  )}
                  <button
                    onClick={() =>
                      setSplitModal({
                        show: true,
                        id: release.id,
                        title: release.title,
                      })
                    }
                    className="p-1.5 bg-black/80 text-white hover:text-purple-400 rounded backdrop-blur-sm border border-white/10"
                    title="Revenue Splits"
                  >
                    <PieChart size={14} />
                  </button>
                  {/* Delete/Takedown Button - Hide if Checking or Processing */}
                  {release.status !== "CHECKING" && release.status !== "PROCESSING" && (
                    <button
                      onClick={() => handleActionClick(release)}
                      className="p-1.5 bg-black/80 text-white hover:text-red-400 rounded backdrop-blur-sm border border-white/10"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div className="absolute top-2 left-2">
                  <span
                    className={`text-xs font-mono px-1.5 py-0.5 rounded border backdrop-blur-md ${release.status === "ACCEPTED"
                      ? "border-green-500/30 text-green-400 bg-green-900/50"
                      : release.status === "CHECKING"
                        ? "border-yellow-500/30 text-yellow-400 bg-yellow-900/50"
                      : release.status === "PROCESSING"
                        ? "border-orange-500/30 text-orange-400 bg-orange-900/50"
                      : release.status === "ERROR" ||
                        release.status === "REJECTED"
                          ? "border-red-500/30 text-red-400 bg-red-900/50"
                          : "border-gray-500/30 text-gray-300 bg-gray-900/50"
                      }`}
                  >
                    {release.status}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <h3 className="font-bold text-lg leading-tight truncate mb-1">
                  {release.title}
                </h3>
                {release.status === "REJECTED" && release.rejectionReason && (
                  <div className="mb-3 mt-1 p-2 bg-red-500/10 border border-red-500/20 rounded text-[12px] text-red-400 font-mono">
                    <span className="font-bold uppercase mr-1">Reason:</span>
                    {release.rejectionReason.substring(0, 34) + "..."}
                  </div>
                )}
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-gray-400 text-xs font-mono">
                      {release.artist}
                    </p>
                    <p className="text-gray-400 text-xs font-mono mt-1">
                      UPC: {release.upc || "PENDING"}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 font-mono">
                    {release.releaseDate || "TBA"}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {paginatedReleases.map((release) => (
            <div
              key={release.id}
              className="group flex flex-col md:flex-row items-center gap-4 bg-surface border border-white/10 p-3 rounded-xl hover:border-blue-500/50 transition-all duration-300"
            >
              <div className="w-16 h-16 shrink-0 relative overflow-hidden bg-black rounded-lg border border-white/5">
                {release.coverArt ? (
                  <img
                    src={release.coverArt}
                    alt={release.title}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-700 font-mono text-[8px]">
                    NO_SIGNAL
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-base leading-tight truncate">
                    {release.title}
                  </h3>
                  <span
                    className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border ${
                      release.status === "ACCEPTED"
                        ? "border-green-500/30 text-green-400 bg-green-900/10"
                        : release.status === "CHECKING"
                          ? "border-yellow-500/30 text-yellow-400 bg-yellow-900/10"
                        : release.status === "PROCESSING"
                          ? "border-orange-500/30 text-orange-400 bg-orange-900/10"
                          : release.status === "ERROR" || release.status === "REJECTED"
                            ? "border-red-500/30 text-red-400 bg-red-900/10"
                            : "border-gray-500/30 text-gray-400 bg-gray-900/10"
                    }`}
                  >
                    {release.status}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-gray-400">
                  <span className="truncate max-w-[150px]">{release.artist}</span>
                  <span>UPC: {release.upc || "PENDING"}</span>
                  <span className="hidden md:inline">{release.releaseDate || "TBA"}</span>
                </div>
                
                {release.status === "REJECTED" && release.rejectionReason && (
                  <div className="mt-2 text-[10px] text-red-400 font-mono truncate">
                    <span className="font-bold uppercase mr-1">Reason:</span>
                    {release.rejectionReason}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handlePreview(release)}
                  className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-blue-400 rounded-lg transition"
                  title="Preview Release"
                >
                  <Eye size={16} />
                </button>
                {release.status !== "CHECKING" && release.status !== "PROCESSING" && (
                  <Link
                    to={`/discography/edit/${release.id}`}
                    className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-green-400 rounded-lg transition"
                  >
                    <Edit2 size={16} />
                  </Link>
                )}
                <button
                  onClick={() =>
                    setSplitModal({
                      show: true,
                      id: release.id,
                      title: release.title,
                    })
                  }
                  className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-purple-400 rounded-lg transition"
                  title="Revenue Splits"
                >
                  <PieChart size={16} />
                </button>
                {release.status !== "CHECKING" && release.status !== "PROCESSING" && (
                  <button
                    onClick={() => handleActionClick(release)}
                    className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-red-400 rounded-lg transition"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* Pagination Controls - Fixed Footer */}
      {!loading && filteredReleases.length > 0 ? (
        <div className="z-40 bg-[#0A0A0A] border-t border-white/10 px-6 lg:px-8 py-4 w-full shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-mono text-gray-500 uppercase">
            <span>Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
              className="bg-black border border-white/10 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value={8}>8</option>
              <option value={16}>16</option>
              <option value={32}>32</option>
              <option value="ALL">ALL</option>
            </select>
            <span>results</span>
            <span className="hidden sm:inline mx-2 text-white/20">|</span>
            <span className="hidden sm:inline text-white/50">{filteredReleases.length} TOTAL</span>
          </div>

          {itemsPerPage !== "ALL" && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 rounded text-white text-[10px] font-bold transition uppercase tracking-wider"
              >
                Prev
              </button>
              
              <div className="flex items-center gap-1 mx-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, i, arr) => (
                    <React.Fragment key={p}>
                      {i > 0 && arr[i - 1] !== p - 1 && <span className="text-gray-600 text-xs px-1">...</span>}
                      <button
                        onClick={() => setCurrentPage(p)}
                        className={`min-w-[28px] h-7 px-1 flex items-center justify-center rounded text-xs transition font-mono ${
                          currentPage === p
                            ? "bg-blue-600 text-white font-bold"
                            : "bg-transparent text-gray-400 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 rounded text-white text-[10px] font-bold transition uppercase tracking-wider"
              >
                Next
              </button>
            </div>
          )}
          </div>
        </div>
      ) : (
        <div className="z-40 bg-[#0A0A0A] border-t border-white/10 px-6 lg:px-8 py-4 w-full h-[62px] shrink-0" />
      )}

      {/* Release Preview Modal */}
      <ReleasePreviewDialog
        isOpen={!!previewRelease}
        onClose={() => setPreviewRelease(null)}
        release={previewRelease}
        tracks={previewTracks}
      />

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-6 animate-fade-in">
          <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-8 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-2">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight">
                {confirmModal.type === "TAKEDOWN"
                  ? "Request Takedown?"
                  : "Confirm Deletion?"}
              </h3>
              <p className="text-gray-400 text-sm font-mono leading-relaxed">
                {confirmModal.type === "TAKEDOWN"
                  ? `You are about to request a professional takedown for "${confirmModal.release?.title}". This will notify all DSPs and move the status to PROCESSING for admin review.`
                  : `This will permanently delete the draft "${confirmModal.release?.title}" and all associated metadata. This action is irreversible.`}
              </p>
            </div>

            <div className="p-4 bg-black/40 border-t border-white/5 flex gap-3">
              <button
                onClick={() =>
                  setConfirmModal({ show: false, release: null, type: null })
                }
                className="flex-1 py-3 border border-white/10 text-gray-500 font-bold uppercase text-xs hover:bg-white/5 transition rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={executeAction}
                disabled={actionLoading}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold uppercase text-xs transition rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.3)] flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : confirmModal.type === "TAKEDOWN" ? (
                  "Confirm Takedown"
                ) : (
                  "Delete Permanent"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <RevenueSplitModal
        isOpen={splitModal.show}
        onClose={() => setSplitModal({ show: false, id: 0, title: "" })}
        releaseId={splitModal.id}
        releaseTitle={splitModal.title}
      />
    </div>
  );
};

export default Discography;

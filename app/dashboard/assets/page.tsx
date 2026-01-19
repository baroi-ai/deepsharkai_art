"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Image as ImageIcon,
  Video,
  AudioLines,
  LayoutGrid,
  Loader2,
  AlertCircle,
  MoreHorizontal,
  Download,
  Trash2,
  FileText,
  CalendarDays,
  Tags,
  PlayCircle,
  ChevronDown,
  ChevronUp,
  Search,
  X as XIcon,
} from "lucide-react";
import { toast } from "sonner";

// --- Debounce Hook ---
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

// --- Types ---
interface DisplayItem {
  id: string;
  jobId: string;
  type: "image" | "video" | "audio";
  previewUrl: string;
  downloadUrls: string[];
  createdAt: string;
  modelName?: string;
  prompt?: string;
  details?: Record<string, any>;
}

type TabValue = "image" | "video" | "audio";
const PRIMARY_GENERATION_TABS: TabValue[] = ["image", "video", "audio"];

// --- Mock Data Generator ---
const GENERATE_MOCK_ITEMS = (type: TabValue, count: number): DisplayItem[] => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `${type}-${i}-${Date.now()}`,
    jobId: `job-${type}-${i}`,
    type,
    previewUrl:
      type === "image"
        ? `https://picsum.photos/seed/${i + type}/400/400`
        : type === "video"
        ? `https://picsum.photos/seed/${i + type}/400/600` // Poster for video
        : "/placeholder-audio.png",
    downloadUrls: [
      type === "video"
        ? "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
        : type === "audio"
        ? "https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav"
        : `https://picsum.photos/seed/${i + type}/800/800`,
    ],
    createdAt: new Date().toISOString(),
    modelName:
      type === "image"
        ? "Seedream V4"
        : type === "video"
        ? "Google Veo 2"
        : "Minimax Speech",
    prompt: `This is a sample prompt for a ${type} generation #${
      i + 1
    }. It describes a scenic view with futuristic elements.`,
  }));
};

// --- Helper Functions ---
const getTypeIcon = (itemType: TabValue): React.ReactElement => {
  switch (itemType) {
    case "image":
      return <ImageIcon className="h-4 w-4" />;
    case "video":
      return <Video className="h-4 w-4" />;
    case "audio":
      return <AudioLines className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const MyGenerationsPage = () => {
  // State
  const [items, setItems] = useState<Record<TabValue, DisplayItem[]>>({
    image: [],
    video: [],
    audio: [],
  });
  const [isLoading, setIsLoading] = useState<Record<TabValue, boolean>>({
    image: true,
    video: true,
    audio: true,
  });
  const [activeTab, setActiveTab] = useState<TabValue>("image");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Modal & Actions State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DisplayItem | null>(null);
  const [isDownloading, setIsDownloading] = useState<Record<string, boolean>>(
    {}
  );
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<DisplayItem | null>(null);

  // --- Mock Data Fetching ---
  const fetchDataForTab = useCallback(async (tab: TabValue) => {
    setIsLoading((prev) => ({ ...prev, [tab]: true }));

    // Simulate API Delay
    setTimeout(() => {
      const newItems = GENERATE_MOCK_ITEMS(tab, 12);
      setItems((prev) => ({
        ...prev,
        [tab]: newItems,
      }));
      setIsLoading((prev) => ({ ...prev, [tab]: false }));
    }, 800);
  }, []);

  // Initial Load & Tab Switch
  useEffect(() => {
    if (items[activeTab].length === 0) {
      fetchDataForTab(activeTab);
    }
  }, [activeTab, fetchDataForTab, items]);

  // Filtering based on search
  const displayedItems = useMemo(() => {
    const currentItems = items[activeTab] || [];
    if (!debouncedSearchQuery) return currentItems;
    return currentItems.filter((item) =>
      item.prompt?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
  }, [activeTab, items, debouncedSearchQuery]);

  // --- Handlers ---
  const handleLoadMore = () => {
    setIsLoading((prev) => ({ ...prev, [activeTab]: true }));
    setTimeout(() => {
      const moreItems = GENERATE_MOCK_ITEMS(activeTab, 8);
      setItems((prev) => ({
        ...prev,
        [activeTab]: [...prev[activeTab], ...moreItems],
      }));
      setIsLoading((prev) => ({ ...prev, [activeTab]: false }));
    }, 1000);
  };

  const handleOpenDeleteConfirm = (item: DisplayItem) => {
    setItemToDelete(item);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;

    // Optimistic Delete
    setItems((prev) => ({
      ...prev,
      [itemToDelete.type]: prev[itemToDelete.type].filter(
        (i) => i.id !== itemToDelete.id
      ),
    }));

    toast.success("Item deleted successfully.");
    setIsDeleteConfirmOpen(false);
    setItemToDelete(null);
    if (selectedItem?.id === itemToDelete.id) setIsModalOpen(false);
  };

  const handleDownload = async (item: DisplayItem) => {
    setIsDownloading((prev) => ({ ...prev, [item.id]: true }));
    // Simulate download delay
    setTimeout(() => {
      setIsDownloading((prev) => ({ ...prev, [item.id]: false }));
      toast.success("Download started");
    }, 1500);
  };

  const handleViewDetails = (item: DisplayItem) => {
    setSelectedItem(item);
    setShowFullPrompt(false);
    setIsModalOpen(true);
  };

  const toggleShowFullPrompt = () => setShowFullPrompt((prev) => !prev);
  const PROMPT_TRUNCATE_LENGTH = 150;

  return (
    <div className="space-y-6 pb-10 px-4 md:px-8 pt-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-100 flex items-center gap-3">
          <LayoutGrid className="h-8 w-8 text-cyan-500" /> My Content
        </h1>
        <div className="relative w-full sm:max-w-xs md:max-w-sm">
          <Input
            type="search"
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 bg-gray-900/50 border-white/10 text-white focus-visible:ring-cyan-500 rounded-md h-10 placeholder:text-gray-500"
          />
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7 text-gray-400 hover:text-white hover:bg-transparent"
              onClick={() => setSearchQuery("")}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabValue)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-950/50 border border-white/10 p-1 h-auto rounded-xl">
          {PRIMARY_GENERATION_TABS.map((tabKey) => (
            <TabsTrigger
              key={tabKey}
              value={tabKey}
              className="data-[state=active]:bg-gray-800 data-[state=active]:text-cyan-400 text-gray-400 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all"
            >
              {getTypeIcon(tabKey)}
              <span className="capitalize">{tabKey}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Grid Content */}
        <div className="min-h-[300px]">
          {isLoading[activeTab] && displayedItems.length === 0 ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-cyan-500 mr-3" />
              <span className="text-gray-400 text-lg">
                Loading {activeTab}s...
              </span>
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="text-center py-20 text-gray-500 border border-dashed border-white/10 rounded-xl bg-white/5">
              <LayoutGrid className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">
                No {activeTab} generations found.
              </p>
              <p className="text-sm">Try generating something new!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {displayedItems.map((item) => (
                <Card
                  key={item.id}
                  className="group relative bg-slate-950/50 border-white/10 hover:border-cyan-500/50 overflow-hidden shadow-sm hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 rounded-xl cursor-pointer"
                >
                  <div
                    className="aspect-square relative w-full h-full overflow-hidden"
                    onClick={() => handleViewDetails(item)}
                  >
                    {item.type === "image" ? (
                      <img
                        src={item.previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : item.type === "video" ? (
                      <>
                        <img
                          src={item.previewUrl}
                          alt="Video Poster"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                          <PlayCircle className="h-12 w-12 text-white/90 drop-shadow-lg" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 p-4">
                        <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center mb-2">
                          <AudioLines className="h-8 w-8 text-cyan-400" />
                        </div>
                        <span className="text-xs text-gray-400 font-mono">
                          AUDIO FILE
                        </span>
                      </div>
                    )}

                    {/* Gradient Overlay on Hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>

                  {/* Quick Actions (Hover) */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-md border border-white/10"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-slate-950 border-white/10 text-gray-300 w-48"
                      >
                        <DropdownMenuItem
                          onClick={() => handleDownload(item)}
                          className="focus:bg-gray-800 focus:text-white cursor-pointer"
                        >
                          <Download className="mr-2 h-4 w-4" /> Download
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleOpenDeleteConfirm(item)}
                          className="text-red-400 focus:bg-red-950/50 focus:text-red-300 cursor-pointer"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Load More Button */}
        {!isLoading[activeTab] && displayedItems.length > 0 && (
          <div className="flex justify-center mt-8">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              className="border-white/10 bg-slate-900 hover:bg-slate-800 text-gray-300 min-w-[150px]"
            >
              Load More
            </Button>
          </div>
        )}
        {isLoading[activeTab] && displayedItems.length > 0 && (
          <div className="flex justify-center mt-8">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
          </div>
        )}
      </Tabs>

      {/* --- Detail View Modal --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-5xl h-[85vh] p-0 bg-slate-950 border-white/10 text-gray-100 flex flex-col md:flex-row overflow-hidden rounded-xl">
          {selectedItem && (
            <>
              {/* Media Preview Side */}
              <div className="flex-[3] bg-black/50 flex items-center justify-center relative border-r border-white/10">
                {selectedItem.type === "image" && (
                  <img
                    src={selectedItem.previewUrl}
                    alt="Full Preview"
                    className="max-w-full max-h-full object-contain"
                  />
                )}
                {selectedItem.type === "video" && (
                  <video
                    src={selectedItem.downloadUrls[0]}
                    controls
                    autoPlay
                    className="max-w-full max-h-full object-contain"
                  />
                )}
                {selectedItem.type === "audio" && (
                  <div className="w-full max-w-md p-8 bg-gray-900 rounded-xl border border-white/10 text-center">
                    <AudioLines className="h-16 w-16 text-cyan-500 mx-auto mb-6" />
                    <audio
                      src={selectedItem.downloadUrls[0]}
                      controls
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              {/* Details Side */}
              <div className="flex-[1.5] flex flex-col border-l border-white/5 bg-slate-900/50">
                <DialogHeader className="p-6 border-b border-white/10">
                  <DialogTitle className="text-xl flex items-center gap-2 capitalize">
                    {getTypeIcon(selectedItem.type)} {selectedItem.type} Details
                  </DialogTitle>
                </DialogHeader>

                <div className="flex-grow p-6 overflow-y-auto space-y-6">
                  {/* Prompt Section */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Prompt
                    </h4>
                    <div className="bg-black/30 p-3 rounded-lg border border-white/5 text-sm leading-relaxed text-gray-300">
                      {showFullPrompt ||
                      (selectedItem.prompt || "").length <=
                        PROMPT_TRUNCATE_LENGTH
                        ? selectedItem.prompt || "No Prompt"
                        : `${(selectedItem.prompt || "").substring(
                            0,
                            PROMPT_TRUNCATE_LENGTH
                          )}...`}

                      {(selectedItem.prompt || "").length >
                        PROMPT_TRUNCATE_LENGTH && (
                        <button
                          onClick={toggleShowFullPrompt}
                          className="block mt-2 text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                        >
                          {showFullPrompt ? (
                            <>
                              Show Less <ChevronUp className="h-3 w-3" />
                            </>
                          ) : (
                            <>
                              Show More <ChevronDown className="h-3 w-3" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Tags className="h-3 w-3" /> Model
                      </h4>
                      <p className="text-sm text-white font-medium">
                        {selectedItem.modelName}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <CalendarDays className="h-3 w-3" /> Date Created
                      </h4>
                      <p className="text-sm text-white font-medium">
                        {new Date(selectedItem.createdAt).toLocaleDateString()}{" "}
                        at{" "}
                        {new Date(selectedItem.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>

                <DialogFooter className="p-6 border-t border-white/10 bg-black/20 gap-3">
                  <Button
                    variant="destructive"
                    onClick={() => handleOpenDeleteConfirm(selectedItem)}
                    className="w-full sm:w-auto bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                  <Button
                    onClick={() => handleDownload(selectedItem)}
                    disabled={isDownloading[selectedItem.id]}
                    className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-500 text-white"
                  >
                    {isDownloading[selectedItem.id] ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Download
                  </Button>
                </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* --- Delete Confirmation Dialog --- */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-white/10 text-gray-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertCircle className="h-5 w-5" /> Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-gray-400 pt-2">
              Are you sure you want to permanently delete this item? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button
                variant="outline"
                className="border-white/10 hover:bg-white/5 text-gray-300"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyGenerationsPage;

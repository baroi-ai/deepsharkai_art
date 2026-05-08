"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  LayoutGrid,
  Loader2,
  AlertCircle,
  MoreHorizontal,
  Download,
  Trash2,
  FileText,
  CalendarDays,
  Tags,
  Search,
  X as XIcon,
} from "lucide-react";
import { toast } from "sonner";

// --- Types ---
interface DisplayItem {
  id: string;
  previewUrl: string;
  width: number;
  height: number;
  ratioType: string;
  createdAt: string;
  modelName: string;
  prompt: string;
}

// --- Debounce Hook ---
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const MyGenerationsPage = () => {
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination State
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DisplayItem | null>(null);
  const [isDownloading, setIsDownloading] = useState<Record<string, boolean>>(
    {},
  );
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<DisplayItem | null>(null);

  const observerTarget = useRef<HTMLDivElement>(null);

  // --- 1. Fetch Logic ---
  const fetchGenerations = useCallback(
    async (cursor: string | null = null, search: string = "") => {
      try {
        let url = `/api/user/generations?limit=20`;
        if (cursor) url += `&cursor=${cursor}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();

        const formattedItems: DisplayItem[] = data.generations.map(
          (gen: any) => ({
            id: gen.id,
            previewUrl: gen.previewUrl || gen.fallbackUrl,
            width: gen.width || 1024,
            height: gen.height || 1024,
            ratioType: gen.aspectRatio || "Custom",
            createdAt: gen.createdAt,
            modelName: gen.model || "Unknown Model",
            prompt: gen.prompt || "No prompt provided",
          }),
        );

        if (cursor) {
          setItems((prev) => [...prev, ...formattedItems]);
        } else {
          setItems(formattedItems);
        }

        setNextCursor(data.nextCursor);
        setHasMore(!!data.nextCursor);
      } catch (error) {
        toast.error("Could not load your assets.");
      }
    },
    [],
  );

  // Handle Search Changes
  useEffect(() => {
    const triggerSearch = async () => {
      setIsLoadingInitial(true);
      await fetchGenerations(null, debouncedSearchQuery);
      setIsLoadingInitial(false);
    };
    triggerSearch();
  }, [debouncedSearchQuery, fetchGenerations]);

  // Load More Handler
  const handleLoadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    await fetchGenerations(nextCursor, debouncedSearchQuery);
    setIsLoadingMore(false);
  }, [nextCursor, isLoadingMore, debouncedSearchQuery, fetchGenerations]);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isLoadingMore &&
          !isLoadingInitial
        ) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 },
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);
    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [hasMore, isLoadingMore, isLoadingInitial, handleLoadMore]);

  // --- Helpers ---
  const handleOpenDeleteConfirm = (item: DisplayItem) => {
    setItemToDelete(item);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const previousItems = [...items];
    setItems((prev) => prev.filter((i) => i.id !== itemToDelete.id));
    setIsDeleteConfirmOpen(false);
    if (selectedItem?.id === itemToDelete.id) setIsModalOpen(false);

    try {
      const res = await fetch(`/api/user/generations?id=${itemToDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Image deleted successfully.");
      setItemToDelete(null);
    } catch (error) {
      setItems(previousItems);
      toast.error("Failed to delete image.");
    }
  };

  const handleDownload = async (item: DisplayItem) => {
    setIsDownloading((prev) => ({ ...prev, [item.id]: true }));
    try {
      const proxyUrl = `/api/download?url=${encodeURIComponent(item.previewUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `generation-${item.id}.png`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch (error) {
      toast.error("Download failed.");
    } finally {
      setIsDownloading((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const handleViewDetails = (item: DisplayItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  return (
    <div className="h-full bg-transparent text-gray-100 pb-20 px-3 md:px-8 pt-6 overflow-y-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 w-full">
        <div className="w-full md:w-auto">
          <h1 className="text-2xl md:text-4xl font-bold flex items-center gap-3">
            <LayoutGrid className="h-6 w-6 md:h-8 md:w-8 text-teal-500" /> My
            Assets
          </h1>
        </div>

        <div className="relative w-full md:w-80">
          <Input
            type="search"
            placeholder="Search all generations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 bg-black/40 border-white/10 text-white focus-visible:ring-teal-500 rounded-full h-10 backdrop-blur-md text-sm"
          />
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7 text-gray-400"
              onClick={() => setSearchQuery("")}
            >
              <XIcon className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* --- PINTEREST MASONRY GRID (BULLETPROOF SIZING) --- */}
      <div className="min-h-[400px] w-full">
        {items.length === 0 && !isLoadingInitial ? (
          <div className="text-center py-32 text-gray-500 border border-dashed border-white/10 rounded-xl bg-white/5">
            <p className="text-lg font-medium">No assets found.</p>
          </div>
        ) : (
          <div className="flex flex-row gap-4 md:gap-6 items-start w-full">
            {[
              ...Array(
                typeof window !== "undefined" && window.innerWidth < 768
                  ? 2
                  : 4,
              ),
            ].map((_, colIndex, cols) => (
              <div
                key={colIndex}
                className="flex flex-col gap-4 md:gap-6 flex-1 min-w-0"
              >
                {items
                  .filter((_, idx) => idx % cols.length === colIndex)
                  .map((item) => (
                    <div
                      key={item.id}
                      // Note: overflow-hidden ensures the image doesn't poke out of the rounded corners
                      className="group relative bg-gray-900 rounded-xl overflow-hidden hover:shadow-2xl hover:shadow-teal-900/20 transition-all duration-300 border border-white/5"
                    >
                      <div
                        className="cursor-zoom-in relative w-full h-full"
                        onClick={() => handleViewDetails(item)}
                      >
                        {/* 🌟 NATIVE NEXT.JS IMAGE SIZING - No inline styles, no fill, just w-full h-auto */}
                        <Image
                          src={item.previewUrl}
                          alt="Generation"
                          width={item.width}
                          height={item.height}
                          className="w-full h-auto block"
                          loading="lazy"
                          unoptimized={true}
                        />
                        <div className="hidden md:flex absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex-col justify-end p-3">
                          <p className="text-white text-[10px] line-clamp-2 mb-8 font-medium opacity-90">
                            {item.prompt}
                          </p>
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 flex gap-2">
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(item);
                          }}
                          disabled={isDownloading[item.id]}
                          className="h-7 w-7 rounded-full bg-black/60 hover:bg-black text-white border border-white/10 backdrop-blur-md"
                        >
                          {isDownloading[item.id] ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Download className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDeleteConfirm(item);
                          }}
                          className="hidden md:flex h-7 w-7 rounded-full bg-black/60 hover:bg-red-600 text-white border border-white/10 backdrop-blur-md"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        )}

        <div ref={observerTarget} className="py-12 flex justify-center w-full">
          {isLoadingInitial || isLoadingMore ? (
            <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
          ) : hasMore ? (
            <Button
              variant="outline"
              onClick={handleLoadMore}
              className="rounded-full border-white/10 bg-white/5 text-gray-300 px-8"
            >
              Load More
            </Button>
          ) : (
            items.length > 0 && (
              <p className="text-gray-500 text-sm italic">
                You've reached the end of your assets.
              </p>
            )
          )}
        </div>
      </div>

      {/* --- Detail View Modal --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[98vw] w-full h-[95vh] md:h-[90vh] p-0 bg-black/95 backdrop-blur-2xl border-white/10 text-gray-100 flex overflow-hidden rounded-xl shadow-2xl flex-col md:flex-row">
          {selectedItem && (
            <>
              <div className="flex-1 w-full h-full min-h-0 bg-black/50 flex items-center justify-center p-4">
                <img
                  src={selectedItem.previewUrl}
                  alt="Preview"
                  className="max-w-full max-h-full w-auto h-auto object-contain drop-shadow-2xl"
                />
              </div>
              <div className="w-full md:w-[350px] flex flex-col border-t md:border-t-0 md:border-l border-white/10 bg-black/40 h-[40%] md:h-full shrink-0">
                <DialogHeader className="p-6 border-b border-white/10 shrink-0">
                  <DialogTitle className="text-xl font-light">
                    Image Details
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-grow p-6 overflow-y-auto space-y-6">
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-teal-500 uppercase tracking-widest flex items-center gap-2">
                      <FileText className="h-3 w-3" /> Prompt
                    </h4>
                    <div className="text-xs md:text-sm leading-relaxed text-gray-300 font-light max-h-[200px] overflow-y-auto">
                      {selectedItem.prompt}
                    </div>
                  </div>
                  <div className="space-y-3 pt-4 border-t border-white/5 text-xs">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-500 flex items-center gap-2">
                        <Tags className="h-3 w-3" /> Model
                      </span>
                      <span className="text-white font-medium bg-white/10 px-2 py-1 rounded">
                        {selectedItem.modelName}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-500 flex items-center gap-2">
                        <CalendarDays className="h-3 w-3" /> Created
                      </span>
                      <span className="text-white font-medium">
                        {new Date(selectedItem.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-6 border-t border-white/10 bg-white/5 flex gap-3 shrink-0">
                  <Button
                    variant="outline"
                    className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 h-11"
                    onClick={() => {
                      setItemToDelete(selectedItem);
                      setIsDeleteConfirmOpen(true);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-teal-500 text-white h-11"
                    onClick={() => handleDownload(selectedItem)}
                    disabled={isDownloading[selectedItem.id]}
                  >
                    {isDownloading[selectedItem.id] ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}{" "}
                    Download
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* --- Delete Confirmation Dialog --- */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-white/10 text-gray-100 mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertCircle className="h-5 w-5" /> Delete Image?
            </DialogTitle>
            <div className="text-gray-400 text-sm pt-2">
              This action cannot be undone.
            </div>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4 flex-col sm:flex-row">
            <DialogClose asChild>
              <Button
                variant="ghost"
                className="hover:bg-white/10 w-full sm:w-auto"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyGenerationsPage;

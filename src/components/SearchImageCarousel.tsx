import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ZoomIn } from 'lucide-react';

interface SearchImageCarouselProps {
  images: string[];
  onImageClick?: (url: string) => void;
}

export function SearchImageCarousel({ images, onImageClick }: SearchImageCarouselProps) {
  const displayableImages = images.filter(img => {
    try {
      if (!img || (!img.startsWith("http://") && !img.startsWith("https://"))) return false;
      const lower = img.toLowerCase();
      return !(
        lower.includes("instagram.com") ||
        lower.includes("facebook.com") ||
        lower.includes("twitter.com") ||
        lower.includes("x.com") ||
        lower.includes("tiktok.com") ||
        lower.includes("youtube.com") ||
        lower.includes("vimeo.com")
      );
    } catch {
      return false;
    }
  });

  if (displayableImages.length === 0) return null;

  return (
    <div className="w-full max-w-full my-3 px-6 relative select-none">
      <Carousel
        opts={{
          align: "start",
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2">
          {displayableImages.map((imgUrl, imgIdx) => (
            <CarouselItem key={imgIdx} className="pl-2 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
              <div className="p-0.5">
                <Card className="overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 shadow-2xs hover:shadow-md transition-all group">
                  <CardContent
                    className="flex aspect-square items-center justify-center p-0 relative cursor-pointer"
                    onClick={() => onImageClick?.(imgUrl)}
                  >
                    <img
                      src={imgUrl}
                      alt={`Imagem ${imgIdx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        // Hide container or image if broken
                        const parent = (e.target as HTMLElement).closest('.pl-2');
                        if (parent) (parent as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ZoomIn className="w-5 h-5 text-white filter drop-shadow-xs" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="-left-3 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800" />
        <CarouselNext className="-right-3 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800" />
      </Carousel>
    </div>
  );
}

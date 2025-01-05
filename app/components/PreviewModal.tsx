import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Tweet } from '@/types/tweet';
import Image from 'next/image';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  tweet: Tweet;
  onPost: () => void;
}

export function PreviewModal({ isOpen, onClose, tweet, onPost }: PreviewModalProps) {
  const handlePost = () => {
    onPost();
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-semibold mb-4">
                  Tweet Preview
                </Dialog.Title>

                {/* Tweet Preview Card */}
                <div className="border rounded-xl p-4 mb-6 bg-gray-50">
                  {/* Author Info */}
                  {tweet.author && (
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="relative w-12 h-12">
                        <Image
                          src={tweet.author.profile_image_url}
                          alt={tweet.author.name}
                          fill
                          className="rounded-full"
                        />
                      </div>
                      <div>
                        <div className="font-semibold">{tweet.author.name}</div>
                        <div className="text-gray-600">@{tweet.author.username}</div>
                      </div>
                    </div>
                  )}

                  {/* Tweet Content */}
                  <div className="text-gray-800 mb-4">
                    {tweet.translated_text || tweet.original_text}
                  </div>

                  {/* Media Preview */}
                  {tweet.media_attachments && tweet.media_attachments.length > 0 && (
                    <div className="mb-4">
                      <div className={`grid gap-2 ${
                        tweet.media_attachments.length === 1 ? 'grid-cols-1' :
                        tweet.media_attachments.length === 2 ? 'grid-cols-2' :
                        tweet.media_attachments.length === 3 ? 'grid-cols-2' :
                        'grid-cols-2'
                      }`}>
                        {tweet.media_attachments.map((media, index) => {
                          const mediaUrl = typeof media === 'string' ? media : media.url;
                          const altText = typeof media === 'string' ? "Tweet image" : (media.alt_text || "Tweet image");
                          
                          return (
                            <div 
                              key={index} 
                              className={`relative border border-gray-200 rounded-xl overflow-hidden ${
                                tweet.media_attachments?.length === 3 && index === 0 ? 'col-span-2' : ''
                              }`}
                              style={{ 
                                aspectRatio: tweet.media_attachments?.length === 1 ? '16/9' : '1/1'
                              }}
                            >
                              <Image
                                src={mediaUrl}
                                alt={altText}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Thread Indicator */}
                  {tweet.thread_id && (
                    <div className="text-blue-600 text-sm mb-4">
                      Part of a thread
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePost}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Post Tweet
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 
import Chat from './Chat';

export default function Home() {
  return (
    <html className="h-full">
      <body className="h-full overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col justify-center h-screen">
          <div className="w-full px-4 h-full flex items-center">
            <div className="w-full max-w-4xl mx-auto">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-700 to-purple-500 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
                <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-10">
                  <h1 className="text-4xl font-bold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Repochat Assistant</h1>
                  <Chat />
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

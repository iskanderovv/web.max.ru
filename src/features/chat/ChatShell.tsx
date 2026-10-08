import { ChatWindow } from './ChatWindow'
import { Sidebar } from './Sidebar'

export function ChatShell() {
  return (
    <div className="flex h-full bg-white">
      <Sidebar />
      <ChatWindow />
    </div>
  )
}

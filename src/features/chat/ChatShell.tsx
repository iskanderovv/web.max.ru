import { ChatWindow } from './ChatWindow'
import { Sidebar } from './Sidebar'

export function ChatShell() {
  return (
    <div className="flex h-full bg-slate-50">
      <Sidebar />
      <ChatWindow />
    </div>
  )
}

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { AppSidebar } from "../custom/AppSidebar"

// admin layout components

const AdminLayout = ({ children }) => {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <div className="flex items-center gap-2 border-b px-4 py-2">
                    <SidebarTrigger />
                    <Separator orientation="vertical" className="h-4" />
                </div>
                <div className="flex-1 overflow-auto p-4">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}

export default AdminLayout

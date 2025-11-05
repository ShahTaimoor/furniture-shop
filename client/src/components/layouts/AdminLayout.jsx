import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "../custom/AppSidebar"

// admin layout components

const AdminLayout = ({ children }) => {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
                <AppSidebar />
                <main className="flex-1 w-full overflow-auto">
                    <div className="p-4 w-full">
                        <SidebarTrigger />
                        {children}
                    </div>
                </main>
            </div>
        </SidebarProvider>
    )
}

export default AdminLayout
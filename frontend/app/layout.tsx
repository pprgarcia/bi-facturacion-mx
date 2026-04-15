import "./globals.css";
// Importamos el proveedor de autenticación
import { AuthProvider } from "@/context/AuthContext";

export const metadata = {
  title: "BI Facturacion MX",
  description: "Análisis de Datos de Business Intelligence para Facturación en México",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body suppressHydrationWarning>
        {/* Envolvemos toda la aplicación aquí */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
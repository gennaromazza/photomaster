import { Route } from "wouter";
import Layout from "@/components/layout/layout";

type ProtectedRouteProps = {
  path: string;
  component: React.ComponentType;
};

// Semplificato per non richiedere autenticazione durante il debug
export function ProtectedRoute({
  path,
  component: Component,
}: ProtectedRouteProps) {
  return (
    <Route path={path}>
      {() => (
        <Layout>
          <Component />
        </Layout>
      )}
    </Route>
  );
}
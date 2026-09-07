import { Redirect } from "expo-router";

/** Fluxo antigo removido: profissional não usa Auth. */
export default function RegisterEmployeeRedirect() {
  return <Redirect href={"/login-profissional" as any} />;
}

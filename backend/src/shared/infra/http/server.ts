import { env } from "../../../config/env.js";
import { app } from "./app.js";

app.listen(env.PORT, () => {
  console.log(`HTTP Server rodando de forma estável na porta ${env.PORT}`);
});

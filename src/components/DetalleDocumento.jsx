import { useState } from "react";
import DetalleOrdenCompra from "./DetalleOrdenCompra";
import DetalleFactura from "./DetalleFactura";

export default function DetalleDocumento({ tipo, data, extra, onClose, onGuardadaOC, onGuardadaFactura }) {
  const [vista, setVista] = useState({ tipo, data, extra: extra || null });

  const irAFactura = (facturaCompleta) => {
    setVista({ tipo: "factura", data: facturaCompleta, extra: null });
  };

  const irAOC = (ordenCompleta, facturaRelacionada) => {
    setVista({ tipo: "oc", data: ordenCompleta, extra: facturaRelacionada });
  };

  if (vista.tipo === "oc") {
    return (
      <DetalleOrdenCompra
        orden={vista.data}
        facturaVinculada={vista.extra}
        onClose={onClose}
        onGuardada={(actualizada) => { onGuardadaOC?.(actualizada); onClose(); }}
        onIrAFactura={irAFactura}
      />
    );
  }

  return (
    <DetalleFactura
      factura={vista.data}
      onClose={onClose}
      onGuardada={(actualizada) => { onGuardadaFactura?.(actualizada); onClose(); }}
      onIrAOC={irAOC}
    />
  );
}

const reservas = [
  { hora: "14:00", mesas: 3 },
  { hora: "14:30", mesas: 2 },
  { hora: "15:00", mesas: 1 },
  { hora: "21:00", mesas: 2 }
];

const totalMesas = 10;

function disponibilidad(hora) {
    const reserva = reservas.find(r => r.hora === hora);
    return reserva ? totalMesas - reserva.mesas : totalMesas;
}

export type GradeInput = {
  studentId: string;
  studentName: string;
  className: string;
  subject: string;
  trimester: string;
  note: number;
  coefficient: number;
  appreciation: string;
  saved: boolean;
};

export function calculerMoyenne(notes: GradeInput[]): number {
  const total = notes.reduce((sum, note) => sum + note.note * note.coefficient, 0);
  const coefficients = notes.reduce((sum, note) => sum + note.coefficient, 0);
  return coefficients > 0 ? total / coefficients : 0;
}

export function calculerRang(moyenneEleve: number, toutesMoyennes: number[]): number {
  return 1 + toutesMoyennes.filter((moyenne) => moyenne > moyenneEleve).length;
}

export function determinerMention(moyenne: number): string {
  if (moyenne >= 80) return 'GRANDE_DISTINCTION';
  if (moyenne >= 70) return 'DISTINCTION';
  if (moyenne >= 60) return 'SATISFACTION';
  if (moyenne >= 50) return 'PASSABLE';
  return 'ECHEC';
}

export function formatMontant(montant: number): string {
  return `${Math.round(montant).toLocaleString('fr-FR')} FC`;
}

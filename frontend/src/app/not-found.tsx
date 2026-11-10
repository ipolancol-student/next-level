import Link from 'next/link';

export default function NoEncontrado() {
  return (
    <div className="py-20 text-center">
      <p className="text-6xl font-bold text-neutral-300">404</p>
      <h1 className="mt-4 text-2xl font-semibold">No encontramos esta página</h1>
      <Link
        href="/tienda"
        className="mt-6 inline-block rounded-full bg-marca px-6 py-2.5 font-medium text-white hover:bg-marca-oscuro"
      >
        Ir a la tienda
      </Link>
    </div>
  );
}

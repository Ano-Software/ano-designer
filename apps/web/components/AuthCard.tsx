"use client";

import Image from "next/image";
import Button from "./Button";
import Input from "./Input";
import PasswordInput from "./PasswordInput";

const AuthCard = () => {
  return (
    <section className="w-full max-w-md rounded-2xl bg-[#193f33] p-8 text-[#F5F7F8] shadow-xl">
      <div className="mb-6 flex flex-col items-center gap-4 text-center">
        <Image src="/logo.png" alt="Ano Designer" width={64} height={64} priority />
        <div>
          <h1 className="text-2xl font-semibold">Area protegida</h1>
          <p className="mt-2 text-sm text-[#F5F7F8]/70">
            Autenticacao Supabase em breve. Enquanto isso, este formulario e apenas um placeholder.
          </p>
        </div>
      </div>
      <form className="flex flex-col gap-4" aria-label="Formulario de autenticacao">
        <Input id="email" type="email" label="E-mail" placeholder="nome@empresa.com" disabled />
        <PasswordInput id="password" label="Senha" placeholder="********" disabled />
        <Button type="button" disabled title="Integracao Supabase pendente">
          Entrar
        </Button>
      </form>
    </section>
  );
};

export default AuthCard;

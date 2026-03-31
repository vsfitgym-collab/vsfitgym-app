import { useState } from "react"
import { supabase } from "../lib/supabase" // ou seu caminho

export default function ResetPassword() {
  const [password, setPassword] = useState("")

  const handleUpdatePassword = async () => {
    const { error } = await supabase.auth.updateUser({
      password
    })

    if (error) {
      alert("Erro ao atualizar senha")
      console.error(error)
    } else {
      alert("Senha atualizada com sucesso!")
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Nova senha</h2>

      <input
        type="password"
        placeholder="Digite sua nova senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={handleUpdatePassword}>
        Atualizar senha
      </button>
    </div>
  )
}
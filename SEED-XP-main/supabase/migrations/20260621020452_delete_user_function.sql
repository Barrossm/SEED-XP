-- Cria uma função poderosa para o Admin deletar usuários
CREATE OR REPLACE FUNCTION delete_user_by_admin(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Isso aqui é a mágica: faz a função rodar com poderes de "Dono do Banco"
AS $$
BEGIN
  -- 1. Primeiro, apagamos o perfil público para evitar erros de dependência
  DELETE FROM public.profiles WHERE user_id = target_user_id;
  
  -- 2. Depois, apagamos a conta de login oficial (isso desloga a pessoa e apaga a senha)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;
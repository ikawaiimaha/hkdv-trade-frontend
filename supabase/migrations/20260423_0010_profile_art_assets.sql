update public.traders
set avatar_url = case buddy_name
  when 'Hello Kitty' then '/assets/avatars/buddy_variants/charm/avatar_charm_cat.png'
  when 'My Melody' then '/assets/avatars/buddy_variants/charm/avatar_charm_hooded.png'
  when 'Cinnamoroll' then '/assets/avatars/buddy_variants/charm/avatar_charm_puppy.png'
  when 'Pompompurin' then '/assets/avatars/buddy_variants/charm/avatar_charm_puppy.png'
  when 'Pochacco' then '/assets/avatars/buddy_variants/charm/avatar_charm_puppy.png'
  when 'Kuromi' then '/assets/avatars/buddy_variants/charm/avatar_charm_hooded.png'
  when 'Little Twin Stars (Kiki & Lala)' then '/assets/avatars/buddy_variants/charm/avatar_charm_hooded.png'
  when 'Tuxedosam' then '/assets/avatars/buddy_variants/charm/avatar_charm_puppy.png'
  when 'Gudetama' then '/assets/avatars/buddy_variants/charm/avatar_charm_cat.png'
  when 'Badtz-Maru' then '/assets/avatars/buddy_variants/charm/avatar_charm_cat.png'
  when 'Wish me mell' then '/assets/avatars/buddy_variants/charm/avatar_charm_hooded.png'
  when 'Cogimyun' then '/assets/avatars/buddy_variants/charm/avatar_charm_hooded.png'
  when 'Kerokerokeroppi' then '/assets/avatars/buddy_variants/charm/avatar_charm_puppy.png'
  when 'Hangyodon' then '/assets/avatars/buddy_variants/charm/avatar_charm_puppy.png'
  when 'Ahiru No Pekkle' then '/assets/avatars/buddy_variants/charm/avatar_charm_puppy.png'
  else avatar_url
end
where avatar_url is null;

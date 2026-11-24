-- Update 3: the product is now called SME Hub. Stored texts that still said SMB Hub.
update mod_settings set email_subject = replace(email_subject, '[SMB Hub]', '[SME Hub]') where email_subject like '%[SMB Hub]%';
alter table mod_settings alter column email_subject set default '[SME Hub] {{user.name}} was suspended automatically';
update profiles set full_name = 'SME Hub Admin' where full_name = 'SMB Hub Admin';

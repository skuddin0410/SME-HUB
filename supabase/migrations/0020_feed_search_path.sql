-- the two window helpers are constants; pin their search_path so the security advisor stays clean
alter function edit_window() set search_path = public;
alter function comment_edit_window() set search_path = public;

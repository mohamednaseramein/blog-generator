ALTER TABLE blogs 
ADD CONSTRAINT fk_blogs_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE author_profiles 
ADD CONSTRAINT fk_author_profiles_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

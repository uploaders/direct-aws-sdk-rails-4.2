Rails.application.routes.draw do
  resources :users, only: [:index, :new, :create]
  get 'pspost', to: 's3#new'
  root 'users#index'
end

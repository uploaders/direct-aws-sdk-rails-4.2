Rails.application.routes.draw do
  resources :users
  get 'pspost', to: 's3#show'
end

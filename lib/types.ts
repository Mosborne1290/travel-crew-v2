export type Trip = {
  id: string;
  name: string;
  description: string | null;
  trip_type: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  primary_destination: string | null;
  home_currency: string;
  cover_image_url: string | null;
  budget_amount: number | null;
  created_at: string;
};

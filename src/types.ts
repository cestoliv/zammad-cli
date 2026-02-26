export interface ZammadTicket {
	id: number;
	number: string;
	title: string;
	group_id: number;
	priority_id: number;
	state_id: number;
	organization_id: number | null;
	owner_id: number;
	customer_id: number;
	note: string | null;
	article_count: number;
	escalation_at: string | null;
	pending_time: string | null;
	type: string | null;
	time_unit: string | null;
	first_response_at: string | null;
	first_response_escalation_at: string | null;
	first_response_in_min: number | null;
	first_response_diff_in_min: number | null;
	close_at: string | null;
	close_escalation_at: string | null;
	close_in_min: number | null;
	close_diff_in_min: number | null;
	update_escalation_at: string | null;
	update_in_min: number | null;
	update_diff_in_min: number | null;
	last_close_at: string | null;
	last_contact_at: string | null;
	last_contact_agent_at: string | null;
	last_contact_customer_at: string | null;
	last_owner_update_at: string | null;
	create_article_type_id: number;
	create_article_sender_id: number;
	preferences: Record<string, unknown>;
	created_by_id: number;
	updated_by_id: number;
	created_at: string;
	updated_at: string;
	// Present when ?expand=true
	group?: string;
	state?: string;
	priority?: string;
	owner?: string;
	customer?: string;
}

export interface ZammadArticle {
	id: number;
	ticket_id: number;
	type_id: number;
	sender_id: number;
	from: string | null;
	to: string | null;
	cc: string | null;
	subject: string | null;
	reply_to: string | null;
	message_id: string | null;
	content_type: string;
	body: string;
	internal: boolean;
	preferences: Record<string, unknown>;
	origin_by_id: number | null;
	created_by_id: number;
	updated_by_id: number;
	created_at: string;
	updated_at: string;
	attachments: ZammadAttachment[];
	// With ?expand=true
	type?: string;
	sender?: string;
	created_by?: string;
	updated_by?: string;
}

export interface ZammadAttachment {
	id: number;
	filename: string;
	size: string;
	preferences: {
		"Content-Type": string;
		"Mime-Type": string;
		"Content-ID"?: string;
		"Content-Disposition"?: string;
	};
}

export interface ZammadUser {
	id: number;
	organization_id: number | null;
	login: string;
	firstname: string;
	lastname: string;
	email: string;
	active: boolean;
	vip: boolean;
	note: string;
	last_login: string | null;
	role_ids: number[];
	group_ids: Record<string, string[]>;
	created_at: string;
	updated_at: string;
}

export interface ZammadTicketState {
	id: number;
	state_type_id: number;
	name: string;
	next_state_id: number | null;
	ignore_escalation: boolean;
	default_create: boolean;
	default_follow_up: boolean;
	active: boolean;
	note: string | null;
}

export interface ZammadConfig {
	url: string;
	token: string;
}

export interface CreateArticleParams {
	ticket_id: number;
	body: string;
	to?: string;
	cc?: string;
	subject?: string;
	content_type?: "text/plain" | "text/html";
	type?: "note" | "email" | "phone" | "web";
	internal?: boolean;
	sender?: "Agent" | "Customer" | "System";
	time_unit?: string;
}

export interface UpdateTicketParams {
	title?: string;
	group?: string;
	state?: string;
	state_id?: number;
	priority?: string;
	owner_id?: number;
	article?: {
		subject?: string;
		body: string;
		type?: string;
		internal?: boolean;
	};
}

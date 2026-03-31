import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsIn,
} from 'class-validator';

/**
 * Supported Notion operations.
 * Add new operations here as the service grows.
 */
export const NOTION_OPERATIONS = [
  'create_page',    // Create a new page inside a parent page or database
  'create_task',    // Create a task/item in a Notion database (requires database_id in metadata)
  'invite_member',  // Invite a user to a workspace/page (requires email in metadata)
] as const;

export type NotionOperation = (typeof NOTION_OPERATIONS)[number];

export class SendNotionDto {
  @IsString()
  @IsNotEmpty()
  messageId: string;

  /**
   * operation: defines which Notion action to perform.
   * Each operation uses specific metadata fields — see NotionService for details.
   */
  @IsString()
  @IsIn(NOTION_OPERATIONS, {
    message: `operation must be one of: ${NOTION_OPERATIONS.join(', ')}`,
  })
  operation: NotionOperation;

  /**
   * For create_page / create_task: the text content / task title.
   * For invite_member: optional note/message.
   */
  @IsString()
  @IsNotEmpty()
  message: string;

  /**
   * Operation-specific metadata:
   *
   * create_page:
   *   - parent_page_id: string   (Notion page ID to create the new page under)
   *   - title?: string           (overrides `message` as page title)
   *   - icon?: string            (emoji icon, e.g. "📋")
   *
   * create_task:
   *   - database_id: string      (Notion database ID)
   *   - title_property?: string  (database property name for the title, default: "Name")
   *   - due_date?: string        (ISO 8601 date)
   *   - assignee_ids?: string[]  (Notion user IDs)
   *   - priority?: string        (e.g. "High", "Medium", "Low")
   *
   * invite_member:
   *   - email: string            (email of the user to invite)
   *   - page_id?: string         (optional: give them access to a specific page)
   */
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

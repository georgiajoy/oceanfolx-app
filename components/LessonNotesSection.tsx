'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export interface LessonNote {
  id: string;
  session_id: string;
  author_user_id: string;
  content: string;
  created_at: string;
  author?: {
    full_name?: string;
  };
}

interface LessonNotesSectionProps {
  sessionId: string;
  currentUserId: string;
  notes: LessonNote[];
  onNotesUpdated: () => void;
}

export default function LessonNotesSection({
  sessionId,
  currentUserId,
  notes,
  onNotesUpdated,
}: LessonNotesSectionProps) {
  const [newNoteContent, setNewNoteContent] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [error, setError] = useState('');

  async function handleAddNote() {
    if (!newNoteContent.trim()) return;

    try {
      setAddingNote(true);
      setError('');
      const { error: insertError } = await supabase.from('lesson_notes').insert({
        session_id: sessionId,
        author_user_id: currentUserId,
        content: newNoteContent,
      });

      if (insertError) throw insertError;
      setNewNoteContent('');
      onNotesUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    try {
      const { error: deleteError } = await supabase
        .from('lesson_notes')
        .delete()
        .eq('id', noteId);

      if (deleteError) throw deleteError;
      onNotesUpdated();
    } catch (err: any) {
      console.error('Error deleting note:', err);
    }
  }

  function getAuthorLabel(note: LessonNote): string {
    if (note.author?.full_name?.trim()) {
      return note.author.full_name;
    }
    return `User ${note.author_user_id.slice(0, 8)}`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Lesson Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="note-content">Add a Note</Label>
          <Textarea
            id="note-content"
            placeholder="Add observations about this lesson..."
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            className="min-h-24"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={handleAddNote} disabled={addingNote || !newNoteContent.trim()}>
            <Send className="h-4 w-4 mr-2" />
            {addingNote ? 'Adding...' : 'Add Note'}
          </Button>
        </div>

        {notes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No notes yet. Add one to get started!
          </div>
        ) : (
          <div className="space-y-3 border-t pt-4">
            {notes.map((note) => (
              <div key={note.id} className="p-3 border rounded-lg bg-gray-50 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {getAuthorLabel(note)}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(note.created_at).toLocaleString()}
                    </span>
                  </div>
                  {currentUserId === note.author_user_id && (
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

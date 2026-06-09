from django.core.management.base import BaseCommand
from django.db import connection
from core.models import Message

class Command(BaseCommand):
    help = 'Clear all messages from the database (keep conversations)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force deletion without confirmation',
        )

    def handle(self, *args, **options):
        # Count existing messages only
        message_count = Message.objects.count()
        
        self.stdout.write(
            self.style.WARNING(f"[STATS] Current database state:")
        )
        self.stdout.write(f"   - Messages: {message_count}")
        
        if message_count == 0:
            self.stdout.write(
                self.style.SUCCESS("[OK] Database is already clean - no messages to delete")
            )
            return
        
        # Ask for confirmation unless --force is used
        if not options['force']:
            self.stdout.write(
                self.style.WARNING("\n[WARN]️  WARNING: This will delete ALL messages!")
            )
            self.stdout.write("[WARN]️  Conversations will be kept intact")
            self.stdout.write("[WARN]️  This action cannot be undone!")
            
            response = input("\nAre you sure you want to continue? (yes/no): ")
            if response.lower() not in ['yes', 'y']:
                self.stdout.write("[ERROR] Cleanup cancelled")
                return
        
        try:
            # Clear all messages only
            self.stdout.write("\n🗑️ Deleting all messages...")
            Message.objects.all().delete()
            self.stdout.write(
                self.style.SUCCESS("[OK] All messages deleted")
            )
            
            # Reset only message auto-increment counter
            self.stdout.write("\n[SYNC] Resetting message ID counter...")
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM sqlite_sequence WHERE name='core_message'")
            
            self.stdout.write(
                self.style.SUCCESS("[OK] Message ID counter reset")
            )
            
            # Verify deletion
            remaining_messages = Message.objects.count()
            
            self.stdout.write(f"\n[STATS] Database after cleanup:")
            self.stdout.write(f"   - Messages: {remaining_messages}")
            
            if remaining_messages == 0:
                self.stdout.write(
                    self.style.SUCCESS("\n🎉 Message cleanup completed successfully!")
                )
                self.stdout.write("   All messages have been removed")
                self.stdout.write("   Conversations are still intact")
            else:
                self.stdout.write(
                    self.style.WARNING("\n[WARN]️ Some messages may still exist - manual cleanup may be needed")
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"[ERROR] Error during cleanup: {e}")
            )

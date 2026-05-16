import { Clapperboard, MessageCircle, Globe, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-background border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <Clapperboard className="w-6 h-6 text-primary" />
              <span className="text-lg font-bold tracking-wider">
                CINECRAFT<span className="text-primary">CLUB</span>
              </span>
            </div>
            <p className="text-muted-foreground text-sm max-w-md">
              The premier destination for Telugu and global cinema lovers to discuss, analyze, and discover movies based on their technical interests.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-foreground">Explore</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/movies" className="hover:text-primary transition-colors">Movies</a></li>
              <li><a href="/groups" className="hover:text-primary transition-colors">Discussions</a></li>
              <li><a href="/trending" className="hover:text-primary transition-colors">Trending</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-foreground">Connect</h3>
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <MessageCircle className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Globe className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
          
        </div>
        
        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} CineCraftClub. All rights reserved.</p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <a href="#" className="hover:text-foreground">Privacy Policy</a>
            <a href="#" className="hover:text-foreground">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
